
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mic, Send, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { FormState } from '@/lib/form-state';
import { initialFormState as defaultInitialFormState } from '@/lib/form-state';
import { fileToDataUri as clientFileToDataUri } from '@/lib/file-utils';

interface QueryInputFormProps {
  formAction: (formData: FormData) => void; // This is the dispatcher from useActionState
  state: FormState;
}

const examplePrompts = [
  "Explain photosynthesis",
  "How do I solve quadratic equations?",
  "What is the water cycle?",
];

function FormSubmitButton({ isDisabled }: { isDisabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full"
      disabled={isDisabled || pending}
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      {pending ? 'Processing...' : 'Submit Query'}
    </Button>
  );
}

export function QueryInputForm({ formAction, state: parentState }: QueryInputFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [preparedQueryImageDataUri, setPreparedQueryImageDataUri] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');
  const { toast } = useToast();
  const formRef = useRef<HTMLFormEFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatusMessage, setVoiceStatusMessage] = useState<string | null>("Click the mic to speak.");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [speechApiSupported, setSpeechApiSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setSpeechApiSupported(false);
      setVoiceStatusMessage("Voice input not supported in your browser.");
    }
  }, []);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file)); // Use createObjectURL for immediate preview
      try {
        const dataUri = await clientFileToDataUri(file);
        setPreparedQueryImageDataUri(dataUri);
      } catch (error) {
        console.error("Error converting image to data URI on client:", error);
        toast({
          variant: 'destructive',
          title: 'Image Processing Error',
          description: 'Could not prepare image for upload. Please try another image.',
        });
        setPreparedQueryImageDataUri(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else {
      setImagePreview(null);
      setPreparedQueryImageDataUri(null);
    }
  };

  useEffect(() => {
    // Reset form on successful submission or if errors are cleared by a new action state
    if (parentState?.timestamp !== defaultInitialFormState.timestamp) { // Check if state has been updated
      if (parentState?.message && parentState.message.includes("successfully")) {
        formRef.current?.reset(); // Resets native form elements
        setQueryText('');
        setImagePreview(null);
        setPreparedQueryImageDataUri(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setVoiceStatusMessage("Click the mic to speak.");
      }
    }
  }, [parentState?.timestamp, parentState?.message]);

  const handleExamplePromptClick = (promptText: string) => {
    setQueryText(promptText);
  };

  const toggleRecording = useCallback(() => {
    if (!speechApiSupported) {
      toast({
        title: "Voice Input Not Supported",
        description: "Please type your query or use a browser that supports voice input.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) { // Should be caught by initial useEffect, but defensive check
      setSpeechApiSupported(false);
      setVoiceStatusMessage("Voice input is not supported in your browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      // setIsRecording(false); // onend will handle this
    } else {
      setQueryText(''); // Clear previous text when starting new recording
      setVoiceStatusMessage("Listening...");
      recognitionRef.current = new SpeechRecognitionAPI();
      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setVoiceStatusMessage("Listening...");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setQueryText(finalTranscript.trim()); // Overwrite queryText with final transcript
        }
        if (interimTranscript && !finalTranscript) {
            setVoiceStatusMessage(`Listening: ${interimTranscript}`);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // setIsRecording(false); // onend will handle this
        let errorMsg = "An error occurred during speech recognition.";
        if (event.error === 'no-speech') {
          errorMsg = "No speech was detected. Please try again.";
        } else if (event.error === 'audio-capture') {
          errorMsg = "Audio capture failed. Make sure your microphone is working.";
        } else if (event.error === 'not-allowed') {
          errorMsg = "Microphone access denied. Please allow microphone access in your browser settings.";
        }
        setVoiceStatusMessage(errorMsg);
        toast({ title: "Voice Input Error", description: errorMsg, variant: "destructive" });
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (queryText) { // Check if queryText (which holds the transcript) has content
          setVoiceStatusMessage("Transcript captured. Review text above or submit.");
        } else if (voiceStatusMessage === "Listening..." || (voiceStatusMessage && voiceStatusMessage.startsWith("Listening:"))) {
           // If it was listening but no final transcript came through (e.g. error or quick stop)
          setVoiceStatusMessage("No transcript captured. Click mic to try again.");
        } else if (!voiceStatusMessage?.includes("error") && !voiceStatusMessage?.includes("captured")) {
             setVoiceStatusMessage("Click the mic to speak.");
        }
        // If there was an error, voiceStatusMessage is already set by onerror.
        // If transcript captured, it's set by onend if queryText has content.
      };

      try {
        recognition.start();
      } catch (e) {
        setIsRecording(false);
        setVoiceStatusMessage("Could not start voice recognition. Is microphone ready?");
        toast({ title: "Voice Input Error", description: "Failed to start voice recognition.", variant: "destructive" });
      }
    }
  }, [isRecording, speechApiSupported, toast, queryText, voiceStatusMessage]); // Added queryText and voiceStatusMessage to deps

  const isSubmitDisabled = !queryText && !preparedQueryImageDataUri;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      {/* Use the formAction prop directly for native form submission handling by useActionState */}
      <form action={formAction} ref={formRef}>
        <CardHeader>
          <CardTitle className="text-2xl">Ask a Question</CardTitle>
          <CardDescription>
            Interact with the AI using text, voice, or images.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="queryText">Your question</Label>
            <Textarea
              id="queryText"
              name="queryText" // Changed name to 'queryText' for FormData
              placeholder="Type or use the microphone to ask anything about your studies..."
              className="min-h-[100px] focus:ring-primary focus:border-primary"
              aria-invalid={!!parentState?.errors?.queryText}
              aria-describedby="queryText-error"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
            {parentState?.errors?.queryText && (
              <p id="queryText-error" className="text-sm text-destructive mt-1">
                {parentState.errors.queryText.join(', ')}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Button
              type="button" // Important: ensure this doesn't submit the form
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={toggleRecording}
              className="p-2 disabled:opacity-50"
              disabled={!speechApiSupported}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              <Mic className={`h-5 w-5 ${isRecording ? 'text-white' : 'text-primary'} ${isRecording && 'animate-pulse'}`} />
            </Button>
            <p className="text-sm text-muted-foreground flex-grow min-h-[1.25rem]">
              {!speechApiSupported ? "Voice input not supported." : voiceStatusMessage }
            </p>
          </div>

          <div className="space-y-2">
            <Label>Or try asking:</Label>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((prompt, index) => (
                <Button
                  key={index}
                  type="button" // Important: ensure this doesn't submit the form
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleExamplePromptClick(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="queryImageFile" className="block">Add an image (optional)</Label>
             <Input
                id="queryImageFile"
                name="queryImageFileInternal" // This name is not directly submitted, data URI is used
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                aria-invalid={!!parentState?.errors?.queryImageDataUri}
                aria-describedby="queryImageDataUri-error"
                ref={fileInputRef}
            />
            {/* Hidden input to carry the data URI to the server action */}
            {preparedQueryImageDataUri && (
              <input type="hidden" name="queryImageDataUri" value={preparedQueryImageDataUri} />
            )}
            {parentState?.errors?.queryImageDataUri && (
              <p id="queryImageDataUri-error" className="text-sm text-destructive mt-1">
                {parentState.errors.queryImageDataUri.join(', ')}
              </p>
            )}
            {imagePreview && (
              <div className="mt-4 space-y-2">
                <Label>Image Preview</Label>
                <div className="relative w-full h-48 border rounded-md overflow-hidden">
                  <Image src={imagePreview} alt="Selected image preview" layout="fill" objectFit="contain" data-ai-hint="preview image"/>
                </div>
              </div>
            )}
          </div>

          <FormSubmitButton isDisabled={isSubmitDisabled} />

          {parentState?.errors?.server && (
            <div className="flex items-center p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md mt-4">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p>{parentState.errors.server.join(', ')}</p>
            </div>
          )}
          {parentState?.message && (parentState.message.includes("Validation failed") || parentState.message.includes("Missing input")) && (
             <div className="flex items-center p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md mt-4">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p>{parentState.message}</p>
            </div>
          )}
        </CardContent>
      </form>
    </Card>
  );
}

    