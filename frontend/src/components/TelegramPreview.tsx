import { Box, Typography, Paper, Button } from '@mui/material';

interface TelegramPreviewProps {
  content: string;
  messageType?: 'user' | 'bot';
  buttons?: Array<Array<{ text: string; callback_data: string }>>;
  onButtonClick?: (callbackData: string) => void;
}

export function TelegramPreview({ content, messageType = 'bot', buttons, onButtonClick }: TelegramPreviewProps) {
  // Replace placeholders with example data
  const previewContent = content
    .replace(/\{firstName\}/g, 'John')
    .replace(/\{batchNumber\}/g, 'UD-DRY-00123')
    .replace(/\{electricity\}/g, '1174.66')
    .replace(/\{humidity\}/g, '30.9')
    .replace(/\{datetime\}/g, '12/09/2025 16:02')
    .replace(/\{errorMessage\}/g, 'Example error');

  // Convert Telegram MarkdownV2 to HTML-like formatting
  const formatText = (text: string) => {
    return text
      // Bold
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      // Escape sequences
      .replace(/\\!/g, '!')
      .replace(/\\-/g, '-')
      .replace(/\\./g, '.')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      // Line breaks
      .replace(/\n/g, '<br />');
  };

  return (
    <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', alignItems: messageType === 'bot' ? 'flex-start' : 'flex-end' }}>
      <Box
        sx={{
          maxWidth: '85%',
          backgroundColor: messageType === 'bot' ? '#ffffff' : '#DCF8C6',
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: '14.2px',
            lineHeight: '1.31',
            color: '#000',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
          dangerouslySetInnerHTML={{ __html: formatText(previewContent) }}
        />

        {/* Inline Keyboard Buttons */}
        {buttons && buttons.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {buttons.map((row, rowIndex) => (
              <Box key={rowIndex} sx={{ display: 'flex', gap: 0.5 }}>
                {row.map((button, btnIndex) => (
                  <Button
                    key={btnIndex}
                    variant="outlined"
                    size="small"
                    fullWidth
                    onClick={() => onButtonClick?.(button.callback_data)}
                    sx={{
                      fontSize: '13px',
                      textTransform: 'none',
                      borderColor: '#e0e0e0',
                      backgroundColor: '#fff',
                      color: '#2481cc',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      minHeight: '32px',
                      '&:hover': {
                        backgroundColor: '#f0f0f0',
                        borderColor: '#d0d0d0',
                      },
                      fontWeight: 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {button.text}
                  </Button>
                ))}
              </Box>
            ))}
          </Box>
        )}
      </Box>
      <Typography variant="caption" sx={{ fontSize: '11px', color: '#8e8e93', mt: 0.5, px: 1 }}>
        {messageType === 'bot' ? '12:34' : '12:35 ✓✓'}
      </Typography>
    </Box>
  );
}

export function TelegramChatSimulator({
  messages,
  onButtonClick
}: {
  messages: Array<{ content: string; type: 'user' | 'bot'; buttons?: Array<Array<{ text: string; callback_data: string }>> }>;
  onButtonClick?: (callbackData: string) => void;
}) {
  return (
    <Paper
      elevation={3}
      sx={{
        maxWidth: '420px',
        width: '100%',
        height: '650px',
        margin: '0 auto',
        backgroundColor: '#0b141a',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Telegram Header */}
      <Box
        sx={{
          backgroundColor: '#202c33',
          color: '#e9edef',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid #2a3942',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#fff',
          }}
        >
          UD
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" sx={{ fontSize: '16px', fontWeight: 500, color: '#e9edef' }}>
            UD System Bot
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '13px', color: '#8696a0' }}>
            online
          </Typography>
        </Box>
      </Box>

      {/* Chat Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 8px',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cpath d='M0 0h260v260H0z' fill='%230b141a'/%3E%3Cpath d='M50 50l10 10-10 10zm20 0l10 10-10 10zm20 0l10 10-10 10z' fill='%23ffffff' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundColor: '#0b141a',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#374045',
            borderRadius: '3px',
          },
        }}
      >
        {messages.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" sx={{ color: '#8696a0', textAlign: 'center' }}>
              No messages yet
            </Typography>
          </Box>
        ) : (
          messages.map((msg, index) => (
            <TelegramPreview
              key={index}
              content={msg.content}
              messageType={msg.type}
              buttons={msg.buttons}
              onButtonClick={onButtonClick}
            />
          ))
        )}
      </Box>

      {/* Input Bar (Read-only for simulator) */}
      <Box
        sx={{
          backgroundColor: '#202c33',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderTop: '1px solid #2a3942',
        }}
      >
        <Box
          sx={{
            flex: 1,
            backgroundColor: '#2a3942',
            borderRadius: '20px',
            padding: '8px 12px',
            color: '#8696a0',
            fontSize: '14px',
          }}
        >
          Message...
        </Box>
      </Box>
    </Paper>
  );
}
