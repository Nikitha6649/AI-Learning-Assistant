
// Placeholder for ConversationPanel.tsx
// This component would manage and display the chat history.
// For now, ResponseDisplay.tsx in the right column serves as a simplified version.

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text?: string;
  chartDataUri?: string;
  timestamp: Date;
}

interface ConversationPanelProps {
  messages: Message[];
  onClearConversation: () => void;
}

export function ConversationPanel({ messages, onClearConversation }: ConversationPanelProps) {
  return (
    <Card className="w-full h-full flex flex-col shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl">Conversation</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClearConversation} aria-label="Clear conversation">
          <Trash2 className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p>No messages yet. Start a conversation!</p>
          </div>
        )}
        {/* TODO: Map through messages and display them */}
      </CardContent>
    </Card>
  );
}
