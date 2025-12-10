import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import toast from 'react-hot-toast';
import MessageSquareIcon from '@mui/icons-material/ChatBubbleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '@/services/api';

interface TelegramMessage {
  id: string;
  key: string;
  name: string;
  content: string;
  description?: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TelegramSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  name: string;
  description?: string;
  category: string;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TelegramStats {
  messages: {
    total: number;
    active: number;
    inactive: number;
  };
  settings: {
    total: number;
  };
  readings: {
    total: number;
    last7Days: number;
  };
}

export default function TelegramManagement() {
  const [messages, setMessages] = useState<Record<string, TelegramMessage[]>>({});
  const [settings, setSettings] = useState<Record<string, TelegramSetting[]>>({});
  const [stats, setStats] = useState<TelegramStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingMessage, setEditingMessage] = useState<TelegramMessage | null>(null);
  const [editingSettings, setEditingSettings] = useState<TelegramSetting | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSettingDialogOpen, setIsSettingDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [messagesData, settingsData, statsData] = await Promise.all([
        api.get('/api/telegram-admin/messages'),
        api.get('/api/telegram-admin/settings'),
        api.get('/api/telegram-admin/stats'),
      ]);

      // Extract data from axios response
      const messagesResult = messagesData.data;
      const settingsResult = settingsData.data;
      const statsResult = statsData.data;
      setMessages(messagesResult);
      setSettings(settingsResult);
      setStats(statsResult);
    } catch (error) {
      console.error('Error loading telegram data:', error);
      toast.error('Failed to load Telegram data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMessage = async () => {
    if (!editingMessage) return;

    try {
      if (editingMessage.id) {
        await api.put(`/api/telegram-admin/messages/${editingMessage.id}`, {
          name: editingMessage.name,
          content: editingMessage.content,
          description: editingMessage.description,
          category: editingMessage.category,
          isActive: editingMessage.isActive,
        });
        toast.success('Message updated successfully');
      } else {
        await api.post('/api/telegram-admin/messages', editingMessage);
        toast.success('Message created successfully');
      }
      setIsDialogOpen(false);
      setEditingMessage(null);
      await loadData();
    } catch (error: any) {
      console.error('Error saving message:', error);
      toast.error(error.response?.data?.error || 'Failed to save message');
    }
  };

  const handleSaveSetting = async () => {
    if (!editingSettings) return;

    try {
      await api.put(`/api/telegram-admin/settings/${editingSettings.id}`, {
        value: editingSettings.value,
      });
      toast.success('Setting updated successfully');
      setIsSettingDialogOpen(false);
      setEditingSettings(null);
      await loadData();
    } catch (error: any) {
      console.error('Error saving setting:', error);
      toast.error(error.response?.data?.error || 'Failed to save setting');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await api.delete(`/api/telegram-admin/messages/${id}`);
      toast.success('Message deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Telegram Bot Management</h1>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.messages.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.messages.active} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Settings</CardTitle>
              <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.settings.total}</div>
              <p className="text-xs text-muted-foreground">Configuration options</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
              <BarChartIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.readings.total}</div>
              <p className="text-xs text-muted-foreground">Via Telegram bot</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
              <BarChartIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.readings.last7Days}</div>
              <p className="text-xs text-muted-foreground">Recent readings</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="messages" className="w-full">
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Manage Telegram bot messages and responses
            </p>
            <Button
              onClick={() => {
                setEditingMessage({
                  id: '',
                  key: '',
                  name: '',
                  content: '',
                  category: 'GENERAL',
                  isActive: true,
                  createdAt: '',
                  updatedAt: '',
                });
                setIsDialogOpen(true);
              }}
            >
              <AddIcon className="mr-2 h-4 w-4" />
              Add Message
            </Button>
          </div>

          {Object.entries(messages).map(([category, categoryMessages]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryMessages.map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell className="font-medium">{msg.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {msg.key}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {msg.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={msg.isActive ? 'default' : 'secondary'}>
                            {msg.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingMessage(msg);
                              setIsDialogOpen(true);
                            }}
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMessage(msg.id)}
                          >
                            <DeleteIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <p className="text-sm text-gray-500">
            Configure Telegram bot settings and behavior
          </p>

          {Object.entries(settings).map(([category, categorySettings]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categorySettings.map((setting) => (
                      <TableRow key={setting.id}>
                        <TableCell className="font-medium">{setting.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {setting.key}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {setting.value}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{setting.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {setting.isEditable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingSettings(setting);
                                setIsSettingDialogOpen(true);
                              }}
                            >
                              <EditIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Edit Message Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMessage?.id ? 'Edit Message' : 'Add Message'}
            </DialogTitle>
            <DialogDescription>
              Configure Telegram bot message content and settings
            </DialogDescription>
          </DialogHeader>

          {editingMessage && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editingMessage.name}
                  onChange={(e) =>
                    setEditingMessage({ ...editingMessage, name: e.target.value })
                  }
                  placeholder="Welcome Message"
                />
              </div>

              <div>
                <Label htmlFor="key">Key</Label>
                <Input
                  id="key"
                  value={editingMessage.key}
                  onChange={(e) =>
                    setEditingMessage({ ...editingMessage, key: e.target.value })
                  }
                  placeholder="welcome_message"
                  disabled={!!editingMessage.id}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={editingMessage.category}
                  onChange={(e) =>
                    setEditingMessage({ ...editingMessage, category: e.target.value })
                  }
                  placeholder="START"
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={editingMessage.content}
                  onChange={(e) =>
                    setEditingMessage({ ...editingMessage, content: e.target.value })
                  }
                  placeholder="Enter message content..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={editingMessage.description || ''}
                  onChange={(e) =>
                    setEditingMessage({
                      ...editingMessage,
                      description: e.target.value,
                    })
                  }
                  placeholder="Shown when user types /start"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingMessage.isActive}
                  onChange={(e) =>
                    setEditingMessage({
                      ...editingMessage,
                      isActive: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <CloseIcon className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSaveMessage}>
              <SaveIcon className="mr-2 h-4 w-4" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Setting Dialog */}
      <Dialog open={isSettingDialogOpen} onOpenChange={setIsSettingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Setting</DialogTitle>
            <DialogDescription>Update Telegram bot setting value</DialogDescription>
          </DialogHeader>

          {editingSettings && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <div className="text-sm font-medium">{editingSettings.name}</div>
              </div>

              <div>
                <Label>Description</Label>
                <div className="text-sm text-gray-500">
                  {editingSettings.description || '-'}
                </div>
              </div>

              <div>
                <Label htmlFor="value">Value</Label>
                {editingSettings.type === 'BOOLEAN' ? (
                  <select
                    id="value"
                    value={editingSettings.value}
                    onChange={(e) =>
                      setEditingSettings({
                        ...editingSettings,
                        value: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : editingSettings.type === 'NUMBER' ? (
                  <Input
                    id="value"
                    type="number"
                    value={editingSettings.value}
                    onChange={(e) =>
                      setEditingSettings({
                        ...editingSettings,
                        value: e.target.value,
                      })
                    }
                  />
                ) : (
                  <Textarea
                    id="value"
                    value={editingSettings.value}
                    onChange={(e) =>
                      setEditingSettings({
                        ...editingSettings,
                        value: e.target.value,
                      })
                    }
                    rows={4}
                    className="font-mono text-sm"
                  />
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSettingDialogOpen(false)}
            >
              <CloseIcon className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSaveSetting}>
              <SaveIcon className="mr-2 h-4 w-4" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
