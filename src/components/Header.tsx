
import { Bot } from 'lucide-react';

export function Header() {
  return (
    <header className="py-6 mb-8 border-b">
      <div className="container mx-auto flex flex-col items-center justify-center text-center sm:flex-row sm:text-left sm:justify-start">
        <Bot className="h-12 w-12 text-primary mr-4 mb-2 sm:mb-0" />
        <div>
          <h1 className="text-4xl font-bold text-primary">AI Learning Assistant</h1>
          <p className="text-lg text-muted-foreground mt-1">Your interactive classroom companion</p>
        </div>
      </div>
    </header>
  );
}
