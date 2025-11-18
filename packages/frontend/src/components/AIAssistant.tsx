import { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import axios, { AxiosError } from 'axios';

type Message = {
  sender: 'user' | 'ai';
  text: string;
  command?: string;
};

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState('OpenAI');
  const [apiKey, setApiKey] = useState('');
  const chatEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('aiApiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !apiKey) return;

    const newMessages: Message[] = [...messages, { sender: 'user', text: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post('/api/ai/analyze', {
        apiKey,
        provider,
        question: input,
      });
      const aiText = res.data.analysis;
      const commandMatch = aiText.match(/`kubectl .*`/);

      setMessages([
        ...newMessages,
        { sender: 'ai', text: aiText, command: commandMatch ? commandMatch[0].slice(1, -1) : undefined },
      ]);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.details || 'Failed to get AI response');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRunCommand = async (command: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('/api/execute-command', { command });
      const newMessages: Message[] = [...messages, { sender: 'ai', text: `Command output:\n\`\`\`\n${res.data.result}\n\`\`\`` }];
      setMessages(newMessages);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.details || 'Failed to execute command');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem('aiApiKey', key);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>AI Assistant</Typography>
      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
          <Box sx={{ display: 'flex', mb: 2, gap: 2 }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Provider</InputLabel>
              <Select value={provider} label="Provider" onChange={(e) => setProvider(e.target.value)}>
                <MenuItem value="OpenAI">OpenAI</MenuItem>
                <MenuItem value="Anthropic">Anthropic</MenuItem>
                <MenuItem value="Gemini">Gemini</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="API Key"
              type="password"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              helperText="Your key is stored locally in your browser."
            />
          </Box>
          <Box sx={{ flexGrow: 1, border: '1px solid #444', borderRadius: 1, p: 2, mb: 2, overflowY: 'auto' }}>
            {messages.map((msg, index) => (
              <Box key={index} sx={{ mb: 2, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{msg.sender}</Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{msg.text}</Typography>
                {msg.command && (
                  <Button variant="outlined" size="small" sx={{ mt: 1 }} onClick={() => handleRunCommand(msg.command!)}>
                    Run: {msg.command}
                  </Button>
                )}
              </Box>
            ))}
            <div ref={chatEndRef} />
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <Box sx={{ display: 'flex' }}>
            <TextField
              fullWidth
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <Button variant="contained" sx={{ ml: 1 }} onClick={handleSend} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Send'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
