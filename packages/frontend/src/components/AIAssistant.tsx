import { Card, CardContent } from './ui';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const initialMessages: Message[] = [
  {
    id: 1,
    role: 'assistant',
    content: 'Hello! I am your Kubernetes AI Assistant. I can help you understand your cluster metrics, troubleshoot issues, and provide recommendations. How can I help you today?',
    timestamp: new Date(),
  },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    setTimeout(() => {
      const aiMessage: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: generateAIResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-100">AI Assistant</h2>
            <p className="text-gray-400">Get intelligent insights about your Kubernetes cluster</p>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800/50 pr-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Bot size={18} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800/50 text-gray-100 border border-gray-700/50'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-60 mt-1 block">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <User size={18} className="text-gray-300" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
              className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={18} />
              Send
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function generateAIResponse(userInput: string): string {
  const input = userInput.toLowerCase();
  
  if (input.includes('pod') || input.includes('pods')) {
    return 'Based on your cluster metrics, you have 25 pods running across 4 nodes. The pods are distributed evenly, which is good for high availability.';
  }
  
  if (input.includes('node') || input.includes('nodes')) {
    return 'Your cluster currently has 4 worker nodes. Node-1 and Node-2 are showing higher resource usage (61% and 55% memory respectively), which is within normal operating parameters.';
  }
  
  if (input.includes('resource') || input.includes('cpu') || input.includes('memory')) {
    return 'Cluster resource utilization looks healthy overall. CPU usage is moderate across all nodes (2-12%), but memory usage is higher on some nodes (up to 61%). Consider scaling horizontally if memory usage consistently exceeds 70%.';
  }
  
  if (input.includes('error') || input.includes('problem') || input.includes('issue')) {
    return 'To help diagnose issues, I will need more specific information. Are you seeing errors in specific pods, nodes, or deployments?';
  }
  
  if (input.includes('scale') || input.includes('scaling')) {
    return 'For scaling recommendations, I suggest implementing Horizontal Pod Autoscaler (HPA) based on your current metrics.';
  }

  if (input.includes('namespace')) {
    return 'You have 6 active namespaces in your cluster. The production namespace has the most workloads (18 pods, 12 deployments), followed by kube-system with 24 pods for system components.';
  }
  
  return 'I can help you with analyzing node and pod health, resource utilization recommendations, troubleshooting deployment issues, scaling strategies, and namespace organization. Could you be more specific about what you would like to know?';
}
