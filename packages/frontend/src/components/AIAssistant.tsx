import { Card, CardContent } from './ui';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import CommandApprovalDialog from './CommandApprovalDialog';
import axios from 'axios';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedCommands?: string[];
};

const initialMessages: Message[] = [
  {
    id: 1,
    role: 'assistant',
    content: 'Hello! I am your Kubernetes AI Assistant. I can help you understand your cluster metrics, troubleshoot issues, and provide recommendations. I can also suggest kubectl commands for you to execute. How can I help you today?',
    timestamp: new Date(),
  },
];

interface AIAssistantProps {
  onCommandSuggested?: (command: string) => void;
}

export default function AIAssistant({ onCommandSuggested }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Extract kubectl commands from markdown code blocks
  const extractKubectlCommands = (content: string): string[] => {
    const regex = /```kubectl\s+(kubectl[^\n]+)/g;
    const commands: string[] = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      commands.push(match[1].trim());
    }
    
    return commands;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Add system message to guide AI about kubectl commands
      const systemMessage = {
        role: 'system',
        content: `You are a Kubernetes expert assistant. When suggesting kubectl commands, format them using this special syntax:
\`\`\`kubectl
kubectl <command>
\`\`\`

For example:
\`\`\`kubectl
kubectl get pods -n kube-system
\`\`\`

These commands will be executable by the user with their approval.`
      };

      // Call the AI API with conversation history
      const conversationMessages = [
        systemMessage,
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: userMessage.role,
          content: userMessage.content,
        }
      ];

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      
      // Extract kubectl commands from the response
      const suggestedCommands = extractKubectlCommands(data.response);
      
      const aiMessage: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        suggestedCommands: suggestedCommands.length > 0 ? suggestedCommands : undefined,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please make sure you have configured an AI provider in the settings.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCommandClick = (command: string) => {
    setPendingCommand(command);
    setShowApprovalDialog(true);
  };

  const executeCommand = async (command: string) => {
    // Add a user message showing the command being executed
    const userMessage: Message = {
      id: messages.length + 1,
      role: 'user',
      content: `Executing command: \`${command}\``,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    
    try {
      const { data } = await axios.post('/api/execute-command', { command });
      
      // Add AI message with the command output
      const aiMessage: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: `Command executed successfully! Here's the output:\n\n\`\`\`json\n${data.result}\n\`\`\``,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      
      // Open terminal if callback is provided
      if (onCommandSuggested) {
        onCommandSuggested(command);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: `Failed to execute command: ${error.response?.data?.details || error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleApproveCommand = () => {
    if (pendingCommand) {
      executeCommand(pendingCommand);
    }
    setShowApprovalDialog(false);
    setPendingCommand(null);
  };

  const handleRejectCommand = () => {
    setShowApprovalDialog(false);
    setPendingCommand(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg animate-gradient shadow-lg shadow-blue-500/50">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI Assistant
            </h2>
            <p className="text-gray-400">Get intelligent insights about your Kubernetes cluster</p>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden scale-in group">
        <CardContent className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800/50 pr-2">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/50 animate-gradient">
                    <Bot size={18} className="text-white" />
                  </div>
                )}
                <div className="flex flex-col gap-2 max-w-[70%]">
                  <div
                    className={`rounded-2xl px-4 py-3 transition-all hover:scale-[1.02] ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gray-800/50 text-gray-100 border border-gray-700/50 hover:border-gray-600/50'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <MarkdownRenderer content={message.content} className="text-sm" />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    )}
                    <span className="text-xs opacity-60 mt-1 block">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {/* Render command execution buttons */}
                  {message.role === 'assistant' && message.suggestedCommands && message.suggestedCommands.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {message.suggestedCommands.map((cmd, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleCommandClick(cmd)}
                          className="px-3 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg text-xs font-mono hover:bg-green-500/30 hover:border-green-500/70 transition-all flex items-center gap-2"
                        >
                          <span>▶</span>
                          <span className="max-w-xs truncate">{cmd}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center shadow-lg">
                    <User size={18} className="text-gray-300" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 justify-start fade-in">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/50 ai-thinking animate-gradient">
                  <Bot size={18} className="text-white" />
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-700/50">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your cluster..."
              className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-all hover:border-gray-600"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed flex items-center gap-2 hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-xl hover:shadow-purple-500/50 animate-gradient"
            >
              <Send size={18} className={isTyping ? '' : 'group-hover:translate-x-1 transition-transform'} />
              Send
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Command Approval Dialog */}
      {pendingCommand && (
        <CommandApprovalDialog
          open={showApprovalDialog}
          command={pendingCommand}
          onApprove={handleApproveCommand}
          onReject={handleRejectCommand}
        />
      )}
    </div>
  );
}
