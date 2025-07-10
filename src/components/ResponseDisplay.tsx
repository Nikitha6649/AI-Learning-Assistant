'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Volume2, VolumeX, MessageSquareText } from 'lucide-react'; // Added MessageSquareText
import type { FormState } from '@/lib/form-state'; // Adjusted path if FormState moved

interface ResponseDisplayProps extends Partial<FormState> {
  isLoading?: boolean;
}

export function ResponseDisplay({ textResponse, chartDataUri, errors, message, isLoading }: ResponseDisplayProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSynthesis(window.speechSynthesis);
    }
  }, []);

  const speakText = useCallback((text: string | null | undefined) => {
    if (!speechSynthesis || !text) {
      if (speechSynthesis && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      return;
    }

    if (speechSynthesis.speaking) {
      speechSynthesis.cancel(); // Stop any ongoing speech
    }

    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.onstart = () => setIsSpeaking(true);
    newUtterance.onend = () => setIsSpeaking(false);
    newUtterance.onerror = () => setIsSpeaking(false);
    
    setUtterance(newUtterance);
    speechSynthesis.speak(newUtterance);
  }, [speechSynthesis]);

  useEffect(() => {
    // Auto-speak only if not loading and there's a new text response.
    // This prevents re-speaking on other state changes if textResponse itself hasn't changed.
    if (textResponse && !isLoading) {
       // Consider adding a check here if you only want to auto-speak on *new* responses,
       // e.g., by comparing with a previous version of textResponse.
       // For now, it will speak if textResponse exists and not loading.
      speakText(textResponse);
    } else if (!textResponse && speechSynthesis?.speaking) {
      // If textResponse becomes null (e.g. form reset) and it was speaking, stop it.
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [textResponse, isLoading]); // speakText is memoized

  const toggleSpeech = () => {
    if (!speechSynthesis) return;

    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    } else if (utterance && utterance.text === textResponse) { 
      // If utterance exists and matches current text, replay
      speechSynthesis.speak(utterance);
    } else if (textResponse) {
      // Otherwise, create and speak new utterance for current textResponse
      speakText(textResponse);
    }
  };
  
  if (isLoading) {
    return (
      <Card className="w-full mx-auto mt-8 lg:mt-0 shadow-xl animate-pulse bg-white">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
          <div className="h-40 bg-muted rounded w-full mt-4"></div>
        </CardContent>
      </Card>
    );
  }
  
  const hasServerError = errors && errors.server;
  const hasResponseData = textResponse || chartDataUri;

  // Determine if we should show the initial placeholder
  // Show placeholder if: not loading, no AI server error, and no response data
  const showPlaceholder = !isLoading && !hasServerError && !hasResponseData;

  return (
    <Card className="w-full mx-auto mt-8 lg:mt-0 shadow-xl bg-white">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center justify-between">
          <div className="flex items-center">
            {hasServerError ? (
              <><AlertTriangle className="mr-2 h-6 w-6 text-destructive" /> Query Status</>
            ) : (
              <><CheckCircle className="mr-2 h-6 w-6 text-green-500" /> Response</>
            )}
          </div>
          {textResponse && speechSynthesis && (
            <Button variant="ghost" size="icon" onClick={toggleSpeech} aria-label={isSpeaking ? "Stop speech" : "Read response aloud"}>
              {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasServerError && message && (
           <div className={`p-4 rounded-md flex items-center bg-destructive/10 text-destructive`}>
            <AlertTriangle className="h-5 w-5 mr-3" />
            <p className="text-sm">{message.includes("AI processing failed") ? errors?.server?.join(', ') : message}</p>
          </div>
        )}

        {textResponse && (
          <div>
            <h3 className="text-xl font-semibold mb-2 text-primary">Explanation</h3>
            <div className="prose prose-sm max-w-none text-foreground/90 bg-secondary/30 p-4 rounded-md shadow">
              {textResponse.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        {chartDataUri && (
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-2 text-primary">Visual Aid</h3>
            <div className="border rounded-md overflow-hidden aspect-video relative bg-muted/20 p-2 shadow">
              <Image 
                src={chartDataUri} 
                alt="Generated chart or visual aid" 
                layout="fill"
                objectFit="contain" 
                data-ai-hint="data chart"
              />
            </div>
          </div>
        )}
        
        {showPlaceholder && (
           <div className="p-4 rounded-md flex flex-col items-center justify-center text-center min-h-[200px]">
             <MessageSquareText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">The AI's response will appear here.</p>
            <p className="text-sm text-muted-foreground">Ask a question using the form on the left.</p>
          </div>
        )}

        {/* Fallback for successfully processed queries that might not have text/chart (e.g. some actions) */}
        {!isLoading && !hasServerError && !hasResponseData && message && message.includes("successfully") && (
           <div className="p-4 rounded-md flex items-center bg-blue-100 text-blue-700">
            <CheckCircle className="h-5 w-5 mr-3" />
            <p className="text-sm">Your query was processed, but no specific text or visual aid was generated for this query.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
