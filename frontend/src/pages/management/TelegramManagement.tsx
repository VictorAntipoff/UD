import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
  Alert,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material';
import toast from 'react-hot-toast';
import MessageSquareIcon from '@mui/icons-material/ChatBubbleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import TelegramIcon from '@mui/icons-material/Telegram';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import CodeIcon from '@mui/icons-material/Code';
import api from '@/services/api';
import { TelegramChatSimulator } from '@/components/TelegramPreview';

interface TelegramButton {
  text: string;
  callback_data?: string;
  url?: string;
}

interface TelegramMessage {
  id: string;
  key: string;
  name: string;
  content: string;
  buttons?: TelegramButton[][];
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<TelegramMessage | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Interactive simulator state
  const [selectedCommand, setSelectedCommand] = useState<string>('start');
  const [customMessageText, setCustomMessageText] = useState<string>('');
  const [simulatorMessages, setSimulatorMessages] = useState<Array<{ content: string; type: 'user' | 'bot' }>>([]);

  // Text formatting ref
  const contentInputRef = React.useRef<HTMLTextAreaElement>(null);

  // Common callback actions for the dropdown
  const commonCallbacks = [
    { value: 'back_to_menu', label: '🏠 Back to Menu' },
    { value: 'menu_all_commands', label: '📋 All Commands' },
    { value: 'menu_help', label: '❓ Help' },
    { value: 'menu_processes', label: '📊 Drying Processes' },
    { value: 'menu_summary', label: '📈 Status Summary' },
    { value: 'menu_add_reading', label: '➕ Add Reading' },
    { value: 'menu_search', label: '🔍 Search Batch' },
    { value: 'filter_all', label: '🔄 Show All Processes' },
    { value: 'custom', label: '✏️ Custom (enter manually)' },
  ];

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

      setMessages(messagesData.data);
      setSettings(settingsData.data);
      setStats(statsData.data);
    } catch (error) {
      console.error('Error loading telegram data:', error);
      toast.error('Failed to load Telegram data');
    } finally {
      setLoading(false);
    }
  };

  // HTML formatting helper
  const applyFormat = (tag: string) => {
    if (!editingMessage || !contentInputRef.current) return;

    const textarea = contentInputRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editingMessage.content.substring(start, end);

    if (selectedText) {
      const openTag = `<${tag}>`;
      const closeTag = `</${tag}>`;
      const formattedText = openTag + selectedText + closeTag;
      const newContent =
        editingMessage.content.substring(0, start) +
        formattedText +
        editingMessage.content.substring(end);

      setEditingMessage({ ...editingMessage, content: newContent });

      // Restore cursor position after state update
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + openTag.length, end + openTag.length);
      }, 0);
    }
  };

  // Button management helpers
  const addButtonRow = () => {
    if (!editingMessage) return;
    const currentButtons = editingMessage.buttons || [];
    setEditingMessage({ ...editingMessage, buttons: [...currentButtons, []] });
  };

  const addButtonToRow = (rowIndex: number) => {
    if (!editingMessage) return;
    const currentButtons = editingMessage.buttons || [];
    const newButtons = [...currentButtons];
    newButtons[rowIndex] = [...(newButtons[rowIndex] || []), { text: '', callback_data: '' }];
    setEditingMessage({ ...editingMessage, buttons: newButtons });
  };

  const updateButton = (rowIndex: number, buttonIndex: number, field: 'text' | 'callback_data' | 'url', value: string) => {
    if (!editingMessage) return;
    const currentButtons = editingMessage.buttons || [];
    const newButtons = [...currentButtons];
    newButtons[rowIndex][buttonIndex] = { ...newButtons[rowIndex][buttonIndex], [field]: value };
    setEditingMessage({ ...editingMessage, buttons: newButtons });
  };

  const removeButton = (rowIndex: number, buttonIndex: number) => {
    if (!editingMessage) return;
    const currentButtons = editingMessage.buttons || [];
    const newButtons = [...currentButtons];
    newButtons[rowIndex].splice(buttonIndex, 1);
    if (newButtons[rowIndex].length === 0) {
      newButtons.splice(rowIndex, 1);
    }
    setEditingMessage({ ...editingMessage, buttons: newButtons });
  };

  const removeRow = (rowIndex: number) => {
    if (!editingMessage) return;
    const currentButtons = editingMessage.buttons || [];
    const newButtons = [...currentButtons];
    newButtons.splice(rowIndex, 1);
    setEditingMessage({ ...editingMessage, buttons: newButtons });
  };

  const handleSaveMessage = async () => {
    if (!editingMessage) return;

    try {
      if (editingMessage.id) {
        await api.put(`/api/telegram-admin/messages/${editingMessage.id}`, {
          name: editingMessage.name,
          content: editingMessage.content,
          buttons: editingMessage.buttons,
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

  // Interactive simulator functions with inline keyboards
  const handleTestCommand = (commandKey: string) => {
    setSimulatorMessages([]);

    const commandMessages: Record<string, Array<{ content: string; type: 'user' | 'bot'; buttons?: Array<Array<{ text: string; callback_data: string }>> }>> = {
      start: [
        { content: '/start', type: 'user' },
        {
          content: messages?.COMMANDS?.find(m => m.key === 'start_message')?.content || '👋 Welcome John!\n\nI\'m the *UD System Bot* - your drying process monitoring assistant.\n\nI can help you:\n• 📊 Monitor active drying processes\n• ➕ Add meter readings\n• ⏱️ Get completion time estimates\n• 📈 Track humidity and electricity\n\n*Quick Start:*\nTap the menu button below to get started!',
          type: 'bot',
          buttons: messages?.COMMANDS?.find(m => m.key === 'start_message')?.buttons || [
            [{ text: '📋 Main Menu', callback_data: 'back_to_menu' }],
            [
              { text: '📋 All Commands', callback_data: 'menu_all_commands' },
              { text: '❓ Help', callback_data: 'menu_help' }
            ]
          ]
        }
      ],
      menu: [
        { content: '/menu', type: 'user' },
        {
          content: messages?.COMMANDS?.find(m => m.key === 'menu_message')?.content || messages?.MENU?.find(m => m.key === 'menu_message')?.content || '🏭 *UD System Bot* - Main Menu\n\nChoose an option below:\n\n📊 *Drying Processes* - View all active batches\n➕ *Add Reading* - Record new meter readings\n📈 *Status Summary* - Quick overview of all processes\n📋 *All Commands* - See available commands\n❓ *Help* - Get help and instructions',
          type: 'bot',
          buttons: messages?.COMMANDS?.find(m => m.key === 'menu_message')?.buttons || messages?.MENU?.find(m => m.key === 'menu_message')?.buttons || [
            [{ text: '📊 Drying Processes', callback_data: 'menu_processes' }],
            [{ text: '➕ Add Reading', callback_data: 'menu_add_reading' }],
            [{ text: '📈 Status Summary', callback_data: 'menu_summary' }],
            [{ text: '📋 All Commands', callback_data: 'menu_all_commands' }],
            [{ text: '❓ Help', callback_data: 'menu_help' }]
          ]
        }
      ],
      help: [
        { content: '/help', type: 'user' },
        {
          content: messages?.COMMANDS?.find(m => m.key === 'help_message')?.content || '📖 *Help - Available Commands*\n\n*Main Commands:*\n• /menu - Show main menu\n• /help - Show this help message\n\n*Main Menu Options:*\n• 📊 *Drying Processes* - View all active batches\n• ➕ *Add Reading* - Record new meter readings\n\n*Adding a Reading:*\n1. Click "Add Reading" from the menu\n2. Select the batch\n3. Enter Electricity reading (kWh)\n4. Enter Humidity reading (%)\n5. Enter Date and Time\n6. Confirm and save',
          type: 'bot',
          buttons: [
            [{ text: '📋 Main Menu', callback_data: 'back_to_menu' }],
            [{ text: '📋 All Commands', callback_data: 'menu_all_commands' }]
          ]
        }
      ],
      processes: [
        { content: '📊 Drying Processes', type: 'user' },
        {
          content: '🔥 Active Drying Processes\n\n━━━━━━━━━━━━━━━━━━━━\n1. UD-DRY-00123\nWood: Oak 25mm - 150 pcs\nHumidity: 35.2%\nElectricity: 1174.66 kWh\nUsed: 234.5 kWh\nEstimation: 2 days (12/11/2025)\n',
          type: 'bot',
          buttons: [
            [
              { text: 'Refresh', callback_data: 'menu_processes' },
              { text: 'Menu', callback_data: 'back_to_menu' }
            ]
          ]
        }
      ],
      add_reading: [
        { content: '➕ Add Reading', type: 'user' },
        {
          content: messages?.PROMPTS?.find(m => m.key === 'select_batch_prompt')?.content || 'Please select a batch:\n\n1. UD-DRY-00123 - Oak 25mm\n2. UD-DRY-00124 - Pine 38mm',
          type: 'bot',
          buttons: [
            [{ text: 'UD-DRY-00123', callback_data: 'select_batch_123' }],
            [{ text: 'UD-DRY-00124', callback_data: 'select_batch_124' }],
            [{ text: '❌ Cancel', callback_data: 'cancel_reading' }]
          ]
        }
      ],
      error: [
        { content: 'abc123', type: 'user' },
        { content: messages?.ERRORS?.find(m => m.key === 'error_invalid_number')?.content || '❌ Invalid input. Please enter a valid number.', type: 'bot' }
      ]
    };

    setSimulatorMessages(commandMessages[commandKey] || []);
  };

  const handleSendCustomMessage = () => {
    if (!customMessageText.trim()) return;

    setSimulatorMessages([...simulatorMessages, { content: customMessageText, type: 'user' }]);
    setCustomMessageText('');

    // Simulate bot response
    setTimeout(() => {
      setSimulatorMessages(prev => [...prev, {
        content: 'This is a simulated bot response. In the actual bot, responses depend on the command and context.',
        type: 'bot'
      }]);
    }, 500);
  };

  const handleClearSimulator = () => {
    setSimulatorMessages([]);
  };

  const handleButtonClick = (callbackData: string) => {
    // Simulate button click behavior
    const buttonActions: Record<string, () => void> = {
      'back_to_menu': () => handleTestCommand('menu'),
      'menu_all_commands': () => {
        setSimulatorMessages(prev => [...prev,
          {
            content: '📋 *Available Commands*\n\n*Main Commands:*\n/start - Welcome message\n/menu - Show main menu\n/help - Show help\n/status - Quick status overview\n\n*Quick Actions:*\n• Type "menu" - Show main menu\n• Send photo 📸 - OCR reading\n• Send number - Manual entry',
            type: 'bot',
            buttons: [[{ text: '🏠 Back to Menu', callback_data: 'back_to_menu' }]]
          }
        ]);
      },
      'menu_help': () => {
        setSimulatorMessages(prev => [...prev,
          {
            content: '📖 *Help - How to Use*\n\n*Adding Readings:*\n1. Click "➕ Add Reading"\n2. Select the batch\n3. Enter Electricity (kWh)\n4. Enter Humidity (%)\n5. Enter Date/Time\n6. Confirm and save\n\n*Photo Reading (OCR):*\n• Send photo of meter\n• Bot extracts reading\n• Confirm or edit value',
            type: 'bot',
            buttons: [
              [{ text: '📋 All Commands', callback_data: 'menu_all_commands' }],
              [{ text: '🏠 Back to Menu', callback_data: 'back_to_menu' }]
            ]
          }
        ]);
      },
      'menu_processes': () => handleTestCommand('processes'),
      'menu_add_reading': () => handleTestCommand('add_reading'),
      'menu_summary': () => {
        setSimulatorMessages(prev => [...prev,
          {
            content: '📊 UD System - Drying Summary\n\nDate: 12/09/2025\n\n━━━━━━━━━━━━━━━━━━━━\n1. UD-DRY-00123\n━━━━━━━━━━━━━━━━━━━━\nWood: Oak 25mm - 150 pcs\nHumidity: 35.2%\nElectricity: 1174.66 kWh\nTotal Used: 234.5 kWh\nEstimation: 2 days',
            type: 'bot',
            buttons: [
              [
                { text: 'View All', callback_data: 'filter_all' },
                { text: 'Refresh', callback_data: 'menu_summary' }
              ],
              [{ text: 'Menu', callback_data: 'back_to_menu' }]
            ]
          }
        ]);
      }
    };

    if (buttonActions[callbackData]) {
      buttonActions[callbackData]();
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TelegramIcon sx={{ fontSize: 40, color: '#0088cc' }} />
          <Typography variant="h4" fontWeight="bold">
            Telegram Bot Management
          </Typography>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" variant="body2">Total Messages</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.messages.total}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {stats.messages.active} active
                    </Typography>
                  </Box>
                  <MessageSquareIcon sx={{ fontSize: 40, color: '#90caf9' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" variant="body2">Settings</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.settings.total}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Configuration options
                    </Typography>
                  </Box>
                  <SettingsIcon sx={{ fontSize: 40, color: '#ce93d8' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" variant="body2">Total Readings</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.readings.total}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Via Telegram bot
                    </Typography>
                  </Box>
                  <BarChartIcon sx={{ fontSize: 40, color: '#81c784' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" variant="body2">Last 7 Days</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.readings.last7Days}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Recent readings
                    </Typography>
                  </Box>
                  <BarChartIcon sx={{ fontSize: 40, color: '#ffb74d' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 64,
              fontSize: '0.95rem',
              fontWeight: 500
            }
          }}
        >
          <Tab
            label="Bot Messages"
            icon={<MessageSquareIcon />}
            iconPosition="start"
          />
          <Tab
            label="Bot Settings"
            icon={<SettingsIcon />}
            iconPosition="start"
          />
          <Tab
            label="Test & Preview"
            icon={<SmartphoneIcon />}
            iconPosition="start"
          />
        </Tabs>

        {/* Messages Tab */}
        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Bot Messages
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Edit the messages your Telegram bot sends to users. Changes take effect immediately.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
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
                  Add Message
                </Button>
              </Box>
              <Alert severity="info">
                💡 Use the "Preview" button to see how each message looks in Telegram before making changes
              </Alert>
            </Box>

            {Object.keys(messages).length === 0 ? (
              <Alert severity="info">No messages found. Click "Add Message" to create your first message.</Alert>
            ) : (
              Object.entries(messages).map(([category, categoryMessages]) => (
                <Box key={category} sx={{ mb: 4 }}>
                  <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      📁 {category}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {categoryMessages.length} message{categoryMessages.length !== 1 ? 's' : ''}
                    </Typography>
                  </Paper>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead sx={{ backgroundColor: '#fafafa' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Message Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Key</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categoryMessages.map((msg) => (
                          <TableRow key={msg.id}>
                            <TableCell sx={{ fontWeight: 500 }}>{msg.name}</TableCell>
                            <TableCell>
                              <Chip label={msg.key} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>{msg.description || '-'}</TableCell>
                            <TableCell>
                              <Chip
                                label={msg.isActive ? 'Active' : 'Inactive'}
                                color={msg.isActive ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Preview Message">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setPreviewMessage(msg);
                                    setIsPreviewOpen(true);
                                  }}
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit Message">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingMessage(msg);
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Message">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteMessage(msg.id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))
            )}
          </Box>
        )}

        {/* Preview Simulator Tab */}
        {tabValue === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Interactive Telegram Simulator</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Test commands and see how messages will appear in Telegram with live preview.
            </Typography>

            <Grid container spacing={3}>
              {/* Controls Panel */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                    Quick Commands
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => handleTestCommand('start')}
                      sx={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        px: 2,
                        py: 1.5,
                        backgroundColor: '#667eea',
                        '&:hover': { backgroundColor: '#5568d3' }
                      }}
                    >
                      👋 /start - Welcome
                    </Button>

                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => handleTestCommand('menu')}
                      sx={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        px: 2,
                        py: 1.5,
                        backgroundColor: '#764ba2',
                        '&:hover': { backgroundColor: '#5f3c82' }
                      }}
                    >
                      📋 /menu - Main Menu
                    </Button>

                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => handleTestCommand('help')}
                      sx={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        px: 2,
                        py: 1.5,
                        backgroundColor: '#f093fb',
                        '&:hover': { backgroundColor: '#d87ee0' }
                      }}
                    >
                      ❓ /help - Help Guide
                    </Button>

                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => handleTestCommand('processes')}
                      sx={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        px: 2,
                        py: 1.5,
                        backgroundColor: '#4facfe',
                        '&:hover': { backgroundColor: '#3f92e6' }
                      }}
                    >
                      📊 View Processes
                    </Button>

                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => handleTestCommand('add_reading')}
                      sx={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        px: 2,
                        py: 1.5,
                        backgroundColor: '#43e97b',
                        '&:hover': { backgroundColor: '#38c766' }
                      }}
                    >
                      ➕ Add Reading
                    </Button>

                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => handleTestCommand('error')}
                      sx={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        px: 2,
                        py: 1.5,
                        backgroundColor: '#fa709a',
                        '&:hover': { backgroundColor: '#e85d88' }
                      }}
                    >
                      ❌ Error Example
                    </Button>

                    <Divider sx={{ my: 1 }} />

                    <Button
                      variant="outlined"
                      color="error"
                      fullWidth
                      startIcon={<RefreshIcon />}
                      onClick={handleClearSimulator}
                      sx={{ py: 1 }}
                    >
                      Clear Chat
                    </Button>
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                    Send Custom Message
                  </Typography>

                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Type a custom message..."
                    value={customMessageText}
                    onChange={(e) => setCustomMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendCustomMessage();
                      }
                    }}
                    sx={{ mb: 2 }}
                  />

                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<SendIcon />}
                    onClick={handleSendCustomMessage}
                    disabled={!customMessageText.trim()}
                  >
                    Send Message
                  </Button>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="caption">
                      Click a command to test, or type your own message to send to the simulator.
                    </Typography>
                  </Alert>
                </Paper>
              </Grid>

              {/* Chat Simulator */}
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {simulatorMessages.length === 0 ? (
                    <Paper
                      sx={{
                        maxWidth: '450px',
                        width: '100%',
                        height: '600px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px'
                      }}
                    >
                      <Box sx={{ textAlign: 'center', p: 4 }}>
                        <SmartphoneIcon sx={{ fontSize: 80, color: '#ccc', mb: 2 }} />
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                          No Messages Yet
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Click a command button to start testing
                        </Typography>
                      </Box>
                    </Paper>
                  ) : (
                    <TelegramChatSimulator
                      messages={simulatorMessages}
                      onButtonClick={handleButtonClick}
                    />
                  )}

                  <Typography variant="caption" color="textSecondary" sx={{ mt: 2, textAlign: 'center', maxWidth: '420px' }}>
                    💡 Interactive simulator - Click buttons in messages to navigate just like the real bot!
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Settings Tab */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">
                Bot Settings
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Configure Telegram bot behavior, permissions, and API settings
              </Typography>
            </Box>

            <Alert severity="warning" sx={{ mb: 3 }}>
              ⚠️ Important: Changes to allowed user IDs require bot restart to take effect
            </Alert>

            {Object.keys(settings).length === 0 ? (
              <Alert severity="info">No settings found.</Alert>
            ) : (
              Object.entries(settings).map(([category, categorySettings]) => (
                <Box key={category} sx={{ mb: 4 }}>
                  <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      ⚙️ {category}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {categorySettings.length} setting{categorySettings.length !== 1 ? 's' : ''}
                    </Typography>
                  </Paper>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead sx={{ backgroundColor: '#fafafa' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Setting Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Key</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Value</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categorySettings.map((setting) => (
                          <TableRow key={setting.id}>
                            <TableCell sx={{ fontWeight: 500 }}>{setting.name}</TableCell>
                            <TableCell>
                              <Chip label={setting.key} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                              {setting.value}
                            </TableCell>
                            <TableCell>
                              <Chip label={setting.type} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="right">
                              {setting.isEditable && (
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingSettings(setting);
                                    setIsSettingDialogOpen(true);
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))
            )}
          </Box>
        )}
      </Paper>

      {/* Edit Message Dialog */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMessage?.id ? 'Edit Message' : 'Add Message'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              fullWidth
              value={editingMessage?.name || ''}
              onChange={(e) => editingMessage && setEditingMessage({ ...editingMessage, name: e.target.value })}
            />
            <TextField
              label="Key"
              fullWidth
              value={editingMessage?.key || ''}
              onChange={(e) => editingMessage && setEditingMessage({ ...editingMessage, key: e.target.value })}
              disabled={!!editingMessage?.id}
              helperText="Unique identifier (e.g., welcome_message)"
            />
            <TextField
              label="Category"
              fullWidth
              value={editingMessage?.category || ''}
              onChange={(e) => editingMessage && setEditingMessage({ ...editingMessage, category: e.target.value })}
            />

            {/* Formatting Toolbar */}
            <Box>
              <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>
                Content (Select text and click to format)
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                <Tooltip title="Bold">
                  <IconButton size="small" onClick={() => applyFormat('b')} sx={{ border: 1, borderColor: 'divider' }}>
                    <FormatBoldIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Italic">
                  <IconButton size="small" onClick={() => applyFormat('i')} sx={{ border: 1, borderColor: 'divider' }}>
                    <FormatItalicIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Underline">
                  <IconButton size="small" onClick={() => applyFormat('u')} sx={{ border: 1, borderColor: 'divider' }}>
                    <FormatUnderlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Strikethrough">
                  <IconButton size="small" onClick={() => applyFormat('s')} sx={{ border: 1, borderColor: 'divider' }}>
                    <StrikethroughSIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Code">
                  <IconButton size="small" onClick={() => applyFormat('code')} sx={{ border: 1, borderColor: 'divider' }}>
                    <CodeIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={8}
              value={editingMessage?.content || ''}
              onChange={(e) => editingMessage && setEditingMessage({ ...editingMessage, content: e.target.value })}
              sx={{ fontFamily: 'monospace' }}
              placeholder="Enter message content..."
              inputRef={contentInputRef}
            />
            <TextField
              label="Description"
              fullWidth
              value={editingMessage?.description || ''}
              onChange={(e) => editingMessage && setEditingMessage({ ...editingMessage, description: e.target.value })}
              helperText="When is this message used?"
            />

            {/* Button Editor */}
            <Divider sx={{ my: 2 }} />
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Telegram Buttons
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addButtonRow}>
                  Add Row
                </Button>
              </Box>
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2 }}>
                Configure inline keyboard buttons that appear below the message
              </Typography>

              {editingMessage?.buttons && editingMessage.buttons.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {editingMessage.buttons.map((row, rowIndex) => (
                    <Paper key={rowIndex} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          Row {rowIndex + 1}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" startIcon={<AddIcon />} onClick={() => addButtonToRow(rowIndex)}>
                            Add Button
                          </Button>
                          <IconButton size="small" color="error" onClick={() => removeRow(rowIndex)} title="Remove Row">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {row.map((button, buttonIndex) => {
                          const isCustomCallback = !commonCallbacks.find(cb => cb.value === button.callback_data);
                          const selectValue = isCustomCallback ? 'custom' : (button.callback_data || '');

                          return (
                            <Box key={buttonIndex} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                              <TextField
                                size="small"
                                label="Button Text"
                                value={button.text}
                                onChange={(e) => updateButton(rowIndex, buttonIndex, 'text', e.target.value)}
                                sx={{ flex: 1 }}
                                placeholder="📋 Main Menu"
                              />
                              <FormControl size="small" sx={{ flex: 1 }}>
                                <InputLabel>Callback Action</InputLabel>
                                <Select
                                  value={selectValue}
                                  label="Callback Action"
                                  onChange={(e) => {
                                    if (e.target.value !== 'custom') {
                                      updateButton(rowIndex, buttonIndex, 'callback_data', e.target.value);
                                    }
                                  }}
                                >
                                  {commonCallbacks.map((cb) => (
                                    <MenuItem key={cb.value} value={cb.value}>
                                      {cb.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              {selectValue === 'custom' && (
                                <TextField
                                  size="small"
                                  label="Custom Callback"
                                  value={button.callback_data || ''}
                                  onChange={(e) => updateButton(rowIndex, buttonIndex, 'callback_data', e.target.value)}
                                  sx={{ flex: 1 }}
                                  placeholder="custom_action"
                                />
                              )}
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeButton(rowIndex, buttonIndex)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          );
                        })}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Alert severity="info">
                  No buttons configured. Click "Add Row" to add inline keyboard buttons.
                </Alert>
              )}
            </Box>

            {/* Live Preview */}
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Live Preview
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2 }}>
                See how this message will appear in Telegram
              </Typography>
              <Box sx={{ bgcolor: '#e5ddd5', p: 2, borderRadius: 1 }}>
                <TelegramChatSimulator
                  messages={[
                    {
                      content: editingMessage?.content || '',
                      type: 'bot',
                      buttons: editingMessage?.buttons
                    }
                  ]}
                  onButtonClick={() => {}}
                />
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={editingMessage?.isActive || false}
                  onChange={(e) => editingMessage && setEditingMessage({ ...editingMessage, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)} startIcon={<CloseIcon />}>
            Cancel
          </Button>
          <Button onClick={handleSaveMessage} variant="contained" startIcon={<SaveIcon />}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Message Dialog */}
      <Dialog open={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SmartphoneIcon sx={{ color: '#667eea' }} />
            <Box>
              <Typography variant="h6">Message Preview</Typography>
              <Typography variant="caption" color="textSecondary">
                See how this message appears in Telegram
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Message Details</Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">Name:</Typography>
                <Typography variant="body2">{previewMessage?.name}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">Key:</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={previewMessage?.key} size="small" variant="outlined" />
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">Category:</Typography>
                <Typography variant="body2">{previewMessage?.category}</Typography>
              </Box>

              {previewMessage?.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">Description:</Typography>
                  <Typography variant="body2">{previewMessage.description}</Typography>
                </Box>
              )}

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  💡 Placeholders like {'{firstName}'}, {'{batchNumber}'}, {'{electricity}'} are replaced with example data
                </Typography>
              </Alert>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Telegram Preview</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <TelegramChatSimulator
                  messages={[
                    {
                      content: previewMessage?.content || '',
                      type: 'bot',
                      buttons: previewMessage?.buttons
                    }
                  ]}
                  onButtonClick={() => {}}
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', px: 3, py: 2 }}>
          <Button onClick={() => setIsPreviewOpen(false)} size="large">
            Close
          </Button>
          <Button
            variant="contained"
            size="large"
            startIcon={<EditIcon />}
            onClick={() => {
              setIsPreviewOpen(false);
              if (previewMessage) {
                setEditingMessage(previewMessage);
                setIsDialogOpen(true);
              }
            }}
          >
            Edit Message
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Setting Dialog */}
      <Dialog open={isSettingDialogOpen} onClose={() => setIsSettingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Setting</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">Name</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>{editingSettings?.name}</Typography>

            {editingSettings?.description && (
              <>
                <Typography variant="subtitle2">Description</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {editingSettings.description}
                </Typography>
              </>
            )}

            <TextField
              label="Value"
              fullWidth
              multiline={editingSettings?.type !== 'BOOLEAN' && editingSettings?.type !== 'NUMBER'}
              rows={editingSettings?.type === 'JSON' || editingSettings?.type === 'LIST' ? 4 : 1}
              type={editingSettings?.type === 'NUMBER' ? 'number' : 'text'}
              value={editingSettings?.value || ''}
              onChange={(e) => editingSettings && setEditingSettings({ ...editingSettings, value: e.target.value })}
              sx={{ fontFamily: 'monospace' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSettingDialogOpen(false)} startIcon={<CloseIcon />}>
            Cancel
          </Button>
          <Button onClick={handleSaveSetting} variant="contained" startIcon={<SaveIcon />}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
