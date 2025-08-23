'use client'

import { useState } from 'react'
import { HelpCenter } from '@/components/help/HelpCenter'
import { FAQSection } from '@/components/help/FAQSection'
import { TourLauncher } from '@/components/help/TourLauncher'
import { ContextualHelp } from '@/components/help/ContextualHelp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, MessageCircle, Play, Lightbulb } from 'lucide-react'

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState('help-center')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Help & Support
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find answers, learn best practices, and get the most out of CustomerSignal
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('help-center')}>
            <CardContent className="p-6 text-center">
              <BookOpen className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Help Articles</h3>
              <p className="text-sm text-gray-600">Browse comprehensive guides and tutorials</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('faq')}>
            <CardContent className="p-6 text-center">
              <MessageCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">FAQ</h3>
              <p className="text-sm text-gray-600">Quick answers to common questions</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('tours')}>
            <CardContent className="p-6 text-center">
              <Play className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Interactive Tours</h3>
              <p className="text-sm text-gray-600">Step-by-step guided tutorials</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('contextual')}>
            <CardContent className="p-6 text-center">
              <Lightbulb className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Contextual Help</h3>
              <p className="text-sm text-gray-600">Get help based on what you're doing</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="help-center">Help Center</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="tours">Interactive Tours</TabsTrigger>
            <TabsTrigger value="contextual">Contextual Help</TabsTrigger>
          </TabsList>

          <TabsContent value="help-center" className="mt-6">
            <HelpCenter />
          </TabsContent>

          <TabsContent value="faq" className="mt-6">
            <FAQSection showSearch={true} />
          </TabsContent>

          <TabsContent value="tours" className="mt-6">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Interactive Tutorials
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Learn how to use CustomerSignal with hands-on, step-by-step guided tours. 
                  Each tour will walk you through specific features and best practices.
                </p>
              </div>
              
              <TourLauncher />
            </div>
          </TabsContent>

          <TabsContent value="contextual" className="mt-6">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Contextual Help Examples
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  These help cards appear automatically based on what you're doing in the app. 
                  Here are some examples of contextual help you might see:
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ContextualHelp 
                  context="dashboard" 
                  className="w-full"
                />
                <ContextualHelp 
                  context="keywords" 
                  className="w-full"
                />
                <ContextualHelp 
                  context="search" 
                  className="w-full"
                />
                <ContextualHelp 
                  context="analytics" 
                  className="w-full"
                />
              </div>

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-900">How Contextual Help Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-blue-800 space-y-2">
                    <p>• Help cards appear automatically when you visit different sections</p>
                    <p>• They provide tips and guidance specific to what you're doing</p>
                    <p>• You can dismiss them once you're familiar with the features</p>
                    <p>• They remember your preferences and won't show again unless you reset them</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Contact Support */}
        <Card className="mt-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Still Need Help?</h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Can't find what you're looking for? Our support team is here to help you get the most out of CustomerSignal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" size="lg">
                Contact Support
              </Button>
              <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600">
                Schedule a Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}