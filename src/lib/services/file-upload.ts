import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { ImportResult, ValidationResult, FieldMapping } from './data-integration';

export interface FileUploadConfig {
  maxFileSize: number; // in bytes
  allowedTypes: string[];
  requiredFields: string[];
  optionalFields: string[];
}

export interface ParsedRow {
  [key: string]: string | number | Date | null;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Date;
  rowCount: number;
}

export class FileUploadService {
  private supabase: ReturnType<typeof createClient<Database>>;
  private bucketName = 'data-imports';

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  async uploadFile(
    tenantId: string,
    file: File,
    userId: string
  ): Promise<{ filePath: string; metadata: FileMetadata }> {
    // Validate file
    this.validateFile(file);

    // Generate unique file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${tenantId}/${timestamp}-${file.name}`;

    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Parse file to get row count
    const content = await this.readFileContent(file);
    const rows = await this.parseFileContent(content, file.type);

    const metadata: FileMetadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date(),
      rowCount: rows.length
    };

    return {
      filePath: data.path,
      metadata
    };
  }

  async processFile(
    tenantId: string,
    filePath: string,
    mapping: FieldMapping,
    userId: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      validationErrors: []
    };

    try {
      // Download file from storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(filePath);

      if (error) {
        throw new Error(`Failed to download file: ${error.message}`);
      }

      // Parse file content
      const content = await data.text();
      const fileType = this.getFileTypeFromPath(filePath);
      const rows = await this.parseFileContent(content, fileType);

      // Validate data
      const validation = this.validateData(rows, mapping);
      result.validationErrors = validation.errors.map(e => e.message);

      if (!validation.isValid) {
        result.errors.push('File contains validation errors');
        return result;
      }

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        try {
          result.recordsProcessed++;
          const row = rows[i];

          // Map fields according to mapping configuration
          const mappedData = this.mapRowData(row, mapping);

          // Convert to conversation format
          const conversation = {
            tenant_id: tenantId,
            content: mappedData.content || mappedData.description || 'Imported data',
            author: mappedData.author || mappedData.customer_name || mappedData.name || 'Unknown',
            platform: 'csv' as const,
            url: null,
            external_id: `csv_${filePath}_${i}`,
            timestamp: mappedData.timestamp || mappedData.created_at || new Date().toISOString(),
            keywords: this.extractKeywords(mappedData),
            tags: ['imported', 'csv'],
            engagement_metrics: {
              importedFrom: filePath,
              rowNumber: i + 1,
              originalData: mappedData
            },
            raw_data: row
          };

          // Insert into database
          const { error } = await this.supabase
            .from('conversations')
            .insert(conversation);

          if (error) {
            result.errors.push({
              row: i + 1,
              field: 'database',
              message: error.message
            });
          } else {
            result.recordsImported++;
          }
        } catch (error) {
          result.errors.push({
            row: i + 1,
            field: 'processing',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Create integration record
      await this.createIntegrationRecord(tenantId, filePath, result, userId);

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.validationErrors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  async validateFileStructure(file: File): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      const content = await this.readFileContent(file);
      const rows = await this.parseFileContent(content, file.type);

      if (rows.length === 0) {
        result.isValid = false;
        result.errors.push({
          row: 0,
          field: 'file',
          message: 'File is empty or contains no valid data'
        });
        return result;
      }

      // Check for common required fields
      const firstRow = rows[0];
      const headers = Object.keys(firstRow);

      const commonFields = ['content', 'description', 'message', 'text', 'body'];
      const hasContentField = commonFields.some(field => 
        headers.some(header => header.toLowerCase().includes(field))
      );

      if (!hasContentField) {
        result.warnings.push({
          row: 0,
          field: 'headers',
          message: 'No obvious content field found. Please ensure you map a content field.'
        });
      }

      // Check for author/customer fields
      const authorFields = ['author', 'customer', 'name', 'user', 'requester'];
      const hasAuthorField = authorFields.some(field => 
        headers.some(header => header.toLowerCase().includes(field))
      );

      if (!hasAuthorField) {
        result.warnings.push({
          row: 0,
          field: 'headers',
          message: 'No obvious author field found. Consider mapping an author field.'
        });
      }

      // Check for timestamp fields
      const timestampFields = ['date', 'time', 'created', 'timestamp'];
      const hasTimestampField = timestampFields.some(field => 
        headers.some(header => header.toLowerCase().includes(field))
      );

      if (!hasTimestampField) {
        result.warnings.push({
          row: 0,
          field: 'headers',
          message: 'No obvious timestamp field found. Records will use import time.'
        });
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push({
        row: 0,
        field: 'file',
        message: error instanceof Error ? error.message : 'Failed to parse file'
      });
      return result;
    }
  }

  async getFileHeaders(file: File): Promise<string[]> {
    const content = await this.readFileContent(file);
    const rows = await this.parseFileContent(content, file.type);
    
    if (rows.length === 0) {
      return [];
    }

    return Object.keys(rows[0]);
  }

  private validateFile(file: File): void {
    const config: FileUploadConfig = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
      requiredFields: [],
      optionalFields: []
    };

    if (file.size > config.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${config.maxFileSize / 1024 / 1024}MB`);
    }

    if (!config.allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not supported. Allowed types: ${config.allowedTypes.join(', ')}`);
    }
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private async parseFileContent(content: string, fileType: string): Promise<ParsedRow[]> {
    if (fileType === 'text/csv') {
      return this.parseCSV(content);
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      // For Excel files, we'd need a library like xlsx
      // For now, assume CSV format or implement Excel parsing
      return this.parseCSV(content);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private parseCSV(content: string): ParsedRow[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = this.parseCSVLine(lines[0]);
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const row: ParsedRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      rows.push(row);
    }

    return rows;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private validateData(rows: ParsedRow[], mapping: FieldMapping): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if required mapped fields exist
    const mappedFields = Object.values(mapping);
    const availableFields = rows.length > 0 ? Object.keys(rows[0]) : [];

    for (const mappedField of mappedFields) {
      if (!availableFields.includes(mappedField)) {
        result.isValid = false;
        result.errors.push({
          row: 0,
          field: mappedField,
          message: `Mapped field '${mappedField}' not found in file headers`
        });
      }
    }

    return result;
  }

  private mapRowData(row: ParsedRow, mapping: FieldMapping): Record<string, any> {
    const mapped: Record<string, any> = {};

    for (const [targetField, sourceField] of Object.entries(mapping)) {
      mapped[targetField] = row[sourceField];
    }

    return mapped;
  }

  private extractKeywords(data: Record<string, any>): string[] {
    const keywords: string[] = [];

    // Extract keywords from various fields
    const keywordFields = ['tags', 'keywords', 'category', 'type', 'status'];
    
    for (const field of keywordFields) {
      const value = data[field];
      if (value && typeof value === 'string') {
        keywords.push(...value.split(',').map(k => k.trim()).filter(k => k));
      }
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  private getFileTypeFromPath(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'csv':
        return 'text/csv';
      case 'xls':
        return 'application/vnd.ms-excel';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'text/csv';
    }
  }

  private async createIntegrationRecord(
    tenantId: string,
    filePath: string,
    result: ImportResult,
    userId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('integrations')
      .insert({
        tenant_id: tenantId,
        type: 'csv',
        name: `File Import: ${filePath.split('/').pop()}`,
        config: {
          filePath,
          importResult: {
            recordsProcessed: result.recordsProcessed,
            recordsImported: result.recordsImported,
            errorCount: result.errors.length
          }
        },
        status: result.success ? 'active' : 'error',
        error_message: result.success ? null : result.errors.slice(0, 5).map(e => 
          typeof e === 'string' ? e : `Row ${e.row}: ${e.message}`
        ).join('; '),
        created_by: userId
      });

    if (error) {
      console.error('Failed to create integration record:', error);
    }
  }
}