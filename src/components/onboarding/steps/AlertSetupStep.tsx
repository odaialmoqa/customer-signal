'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Bell, Mail, Smartphone, AlertTriangle } from 'lucide-react'

interface AlertSetupStepProps {
  onComplete: () => void
}

export function AlertSetupStep({ onComplete }: AlertSetupStepProps) {
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [alertFrequency, setAlertFrequency] = useState('immediate')
  const [sentimentThreshold, setSentimentThreshold] = useState([70])
  const [volumeThreshold, setVolumeThreshold] = useState([10])

  const alertTypes = [
    {
      id: 'negative-sentiment',
      name: 'Negative Sentiment',
      description: 'Alert when negative mentions exceed threshold',
      icon: AlertTriangle,
      enabled: true
    },
    {
      id: 'volume-spike',
      name: 'Volume Spike',
      description: 'Alert when mention volume increases significantly',
      icon: Bell,
      enabled: true
    },
    {
      id: 'new-platform',
      name: 'New Platform Mentions',
      description: 'Alert when mentions appear on new platforms',
      icon: Smartphone,
      enabled: false
    }
  ]

  const frequencyOptions = [
    { value: 'immediate', label: 'Immediate', description: 'Get alerts as soon as mentions are detected' },
    { value: 'hourly', label: 'Hourly Digest', description: 'Receive a summary every hour' },
    { value: 'daily', label: 'Daily Summary', description: 'Get a daily report of all mentions' },
    { value: 'weekly', label: 'Weekly Report', description: 'Receive a comprehensive weekly summary' }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Configure Alert Preferences
        </h2>
        <p className="text-gray-600">
          Set up notifications to stay informed about important mentions
        </p>
      </div>

      {/* Notification Channels */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Notification Channels</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-500" />
                <div>
                  <Label htmlFor="email-alerts">Email Alerts</Label>
                  <p className="text-sm text-gray-500">Receive alerts via email</p>
                </div>
              </div>
              <Switch
                id="email-alerts"
                checked={emailAlerts}
                onCheckedChange={setEmailAlerts}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="w-4 h-4 text-gray-500" />
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-gray-500">Browser and mobile notifications</p>
                </div>
              </div>
              <Switch
                id="push-notifications"
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Frequency */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Alert Frequency</h3>
          
          <div className="space-y-3">
            <Label>How often would you like to receive alerts?</Label>
            <Select value={alertFrequency} onValueChange={setAlertFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Alert Thresholds</h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Negative Sentiment Threshold</Label>
                <Badge variant="secondary">{sentimentThreshold[0]}%</Badge>
              </div>
              <p className="text-sm text-gray-500 mb-3">
                Alert when negative sentiment exceeds this percentage
              </p>
              <Slider
                value={sentimentThreshold}
                onValueChange={setSentimentThreshold}
                max={100}
                min={10}
                step={5}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Volume Spike Threshold</Label>
                <Badge variant="secondary">{volumeThreshold[0]} mentions</Badge>
              </div>
              <p className="text-sm text-gray-500 mb-3">
                Alert when mentions exceed this number in an hour
              </p>
              <Slider
                value={volumeThreshold}
                onValueChange={setVolumeThreshold}
                max={100}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-900 mb-2">Alert Preview</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>✓ {emailAlerts ? 'Email alerts enabled' : 'Email alerts disabled'}</p>
            <p>✓ {pushNotifications ? 'Push notifications enabled' : 'Push notifications disabled'}</p>
            <p>✓ Frequency: {frequencyOptions.find(o => o.value === alertFrequency)?.label}</p>
            <p>✓ Alert when negative sentiment exceeds {sentimentThreshold[0]}%</p>
            <p>✓ Alert when mentions exceed {volumeThreshold[0]} per hour</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onComplete}
        >
          Skip Alert Setup
        </Button>
        <Button onClick={onComplete}>
          Save Alert Settings
        </Button>
      </div>
    </div>
  )
}