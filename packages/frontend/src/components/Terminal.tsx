import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, X, Trash2, Copy, Check } from 'lucide-react';
import { Card, CardContent, Button } from './ui';
import axios from 'axios';

export interface CommandExecution {
  id: string;
  command: string;
  output: string;
  timestamp: Date;
  status: 'success' | 'error';
}

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCommand?: string;
}

export default function Terminal({ isOpen, onClose, initialCommand }: TerminalProps) {
  const [history, setHistory] = useState<CommandExecution[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialCommand && isOpen) {
      setCurrentCommand(initialCommand);
      // Auto-focus the input when opened with a command
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [initialCommand, isOpen]);

  useEffect(() => {
    // Auto-scroll to bottom when new entries are added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    setIsExecuting(true);
    const executionId = `exec-${Date.now()}`;

    try {
      const { data } = await axios.post('/api/execute-command', { command });
      
      const execution: CommandExecution = {
        id: executionId,
        command,
        output: data.result,
        timestamp: new Date(),
        status: 'success',
      };
      
      setHistory(prev => [...prev, execution]);
      setCurrentCommand('');
    } catch (error: any) {
      const execution: CommandExecution = {
        id: executionId,
        command,
        output: error.response?.data?.details || error.message || 'Failed to execute command',
        timestamp: new Date(),
        status: 'error',
      };
      
      setHistory(prev => [...prev, execution]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isExecuting) {
      executeCommand(currentCommand);
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-5xl h-[80vh] flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg shadow-lg">
                <TerminalIcon className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-100">Kubectl Terminal</h2>
                <p className="text-xs text-gray-400">Execute kubectl commands on your cluster</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={clearHistory}
                className="flex items-center gap-2"
                disabled={history.length === 0}
              >
                <Trash2 size={16} />
                Clear
              </Button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Terminal Content */}
          <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
            {/* Command History */}
            <div
              ref={terminalRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-gray-950/50 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
            >
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <TerminalIcon size={48} className="mb-4 opacity-50" />
                  <p>No commands executed yet</p>
                  <p className="text-xs mt-2">Type a kubectl command below to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((exec) => (
                    <div key={exec.id} className="space-y-2">
                      {/* Command Line */}
                      <div className="flex items-start gap-2">
                        <span className="text-green-400 select-none">$</span>
                        <span className="text-blue-400 flex-1">{exec.command}</span>
                        <button
                          onClick={() => copyToClipboard(exec.command, `cmd-${exec.id}`)}
                          className="text-gray-500 hover:text-gray-300 transition-colors"
                          title="Copy command"
                        >
                          {copiedId === `cmd-${exec.id}` ? (
                            <Check size={14} className="text-green-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                      
                      {/* Output */}
                      <div className={`pl-4 relative group ${exec.status === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                        <button
                          onClick={() => copyToClipboard(exec.output, `out-${exec.id}`)}
                          className="absolute -left-0 top-0 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity"
                          title="Copy output"
                        >
                          {copiedId === `out-${exec.id}` ? (
                            <Check size={14} className="text-green-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                          {exec.output}
                        </pre>
                      </div>
                      
                      {/* Timestamp */}
                      <div className="text-xs text-gray-600 pl-4">
                        {exec.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Command Input */}
            <div className="border-t border-gray-700 bg-gray-800/50 p-4">
              <div className="flex items-center gap-2 font-mono text-sm">
                <span className="text-green-400 select-none">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={currentCommand}
                  onChange={(e) => setCurrentCommand(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="kubectl get pods"
                  disabled={isExecuting}
                  className="flex-1 bg-transparent border-none outline-none text-blue-400 placeholder-gray-600 disabled:opacity-50"
                  autoFocus
                />
                {isExecuting && (
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Press Enter to execute • Only kubectl commands are allowed
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
