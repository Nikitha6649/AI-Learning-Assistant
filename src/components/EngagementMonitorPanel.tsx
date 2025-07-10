
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dot, Video, VideoOff, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { analyzeFacialExpression, type AnalyzeFacialExpressionOutput } from '@/ai/flows/analyze-facial-expression-flow';

const ANALYSIS_INTERVAL = 10000; // Analyze every 10 seconds
const MAX_DIMENSION_CHECK_ATTEMPTS = 5;
const DIMENSION_CHECK_DELAY = 300; // ms

export function EngagementMonitorPanel() {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(false);
  const [scores, setScores] = useState<Omit<AnalyzeFacialExpressionOutput, 'teachingRecommendation'>>({
    engagementScore: 0,
    attentionScore: 0,
    confusionScore: 0,
  });
  const [recommendation, setRecommendation] = useState<string>("Enable monitoring to receive recommendations.");
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [isInitializingCamera, setIsInitializingCamera] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const listenersAttachedRef = useRef(false);
  const isRequestInProgressRef = useRef(false); // Ref to guard against re-entrant requests
  const { toast } = useToast();

  const captureAndAnalyzeFrame = useCallback(async () => {
    if (!videoRef.current || !videoRef.current.srcObject || videoRef.current.paused || videoRef.current.ended) {
      console.warn("Frame capture skipped: Video not ready, not actively streaming, paused, or ended.");
      return;
    }
    
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Video dimensions are zero, skipping frame capture for this interval.");
      return;
    }

    setIsLoadingAnalysis(true);
    setErrorMessage(null);
    const canvas = canvasRef.current;
    if (!canvas) {
        toast({ variant: "destructive", title: "Canvas Error", description: "Canvas element not found." });
        setIsLoadingAnalysis(false);
        return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      toast({ variant: "destructive", title: "Canvas Error", description: "Could not get canvas context." });
      setIsLoadingAnalysis(false);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUri = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const result = await analyzeFacialExpression({ photoDataUri: imageDataUri });
      setScores({
        engagementScore: result.engagementScore,
        attentionScore: result.attentionScore,
        confusionScore: result.confusionScore,
      });
      setRecommendation(result.teachingRecommendation);
    } catch (error) {
      console.error('Error analyzing facial expression:', error);
      setErrorMessage('Failed to analyze expression. Retrying...');
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [toast]);

  const stopMonitoringInternal = useCallback(() => {
    console.log("stopMonitoringInternal called");
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null; 
    }
    
    setMediaStream(null); 
    setIsMonitoringActive(false);
    listenersAttachedRef.current = false; 
    setRecommendation("Monitoring stopped. Enable to resume.");
    setScores({ engagementScore: 0, attentionScore: 0, confusionScore: 0 });
    setIsLoadingAnalysis(false);
    setIsInitializingCamera(false); 
    isRequestInProgressRef.current = false; // Ensure this is reset
  }, [toast]); // toast is stable

  const requestCameraAndStart = useCallback(async () => {
    if (isRequestInProgressRef.current || isMonitoringActive) {
      console.log("Request to start camera, but already in progress or active.");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({ variant: "destructive", title: "Camera Error", description: "Your browser does not support camera access (getUserMedia)." });
      setHasCameraPermission(false);
      // No need to set isMonitoringActive to false here, it should already be false.
      return;
    }
    
    isRequestInProgressRef.current = true;
    setIsInitializingCamera(true);
    setErrorMessage(null);
    setHasCameraPermission(null);
    listenersAttachedRef.current = false;

    try {
      console.log("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 } } });
      console.log("Camera access granted, stream object:", stream);
      setHasCameraPermission(true);
      setMediaStream(stream); // This will trigger the useEffect below
    } catch (err) {
      console.error('Error accessing camera:', err);
      let message = 'Could not access camera. Please ensure permissions are granted.';
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            message = 'Camera access denied. Please enable camera permissions in your browser settings.';
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            message = 'No camera found. Please ensure a camera is connected and enabled.';
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            message = 'Camera is already in use or a hardware error occurred.';
        } else if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
            message = 'The camera does not support the requested resolution or constraints.';
        } else if (err.name === "AbortError") {
            message = 'Camera access request was aborted.';
        } else if (err.name === "SecurityError") {
            message = 'Camera access is not allowed on insecure origins (HTTP). Try HTTPS or localhost.';
        }
      }
      toast({ variant: 'destructive', title: 'Camera Access Error', description: message });
      setHasCameraPermission(false);
      setMediaStream(null); 
      // isMonitoringActive should be false if we reached here due to an error
    } finally {
      setIsInitializingCamera(false);
      isRequestInProgressRef.current = false;
    }
  }, [isMonitoringActive, toast]); // Added isMonitoringActive, toast

  useEffect(() => {
    const videoElement = videoRef.current;
    const streamToCleanUp = mediaStream; // Capture the stream instance for cleanup

    if (mediaStream && videoElement) {
      console.log("useEffect[mediaStream]: Stream present. Setting up video element.", mediaStream.id);
      videoElement.srcObject = mediaStream;
      
      const handleLoadedMetadata = () => {
        console.log("Video event: loadedmetadata. Dimensions:", videoElement.videoWidth, videoElement.videoHeight);
        videoElement.play().catch(err => {
            console.error("video.play() from loadedmetadata failed:", err);
            toast({variant: "destructive", title: "Video Playback Error", description: `Could not start video playback: ${err.message}`});
            stopMonitoringInternal();
        });
      };

      const startActiveMonitoringWithRetry = async () => {
        if (listenersAttachedRef.current || !videoElement.srcObject || !videoElement.HAVE_CURRENT_DATA) return;

        for (let attempt = 0; attempt < MAX_DIMENSION_CHECK_ATTEMPTS; attempt++) {
          console.log(`Video event: playing/canplay. Attempt ${attempt + 1}. Dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
          if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            setIsMonitoringActive(true);
            setRecommendation("Monitoring active. Analyzing expressions...");
            setErrorMessage(null);
            
            captureAndAnalyzeFrame(); 

            if (intervalIdRef.current) clearInterval(intervalIdRef.current);
            intervalIdRef.current = setInterval(captureAndAnalyzeFrame, ANALYSIS_INTERVAL);
            
            listenersAttachedRef.current = true;
            console.log("Monitoring started successfully.");
            return; 
          }
          if (attempt < MAX_DIMENSION_CHECK_ATTEMPTS - 1) {
            console.log(`Dimensions not ready, retrying in ${DIMENSION_CHECK_DELAY}ms...`);
            await new Promise(resolve => setTimeout(resolve, DIMENSION_CHECK_DELAY));
            if (videoElement.paused || videoElement.ended || !videoElement.srcObject) {
              console.log("Video stopped or srcObject removed during dimension check retries.");
              return; 
            }
          }
        }
        
        console.warn(`Video 'playing' but dimensions not ready after ${MAX_DIMENSION_CHECK_ATTEMPTS} attempts. Monitoring not started.`);
        toast({
          variant: "warning", // Changed to warning as stream might be playing but dimensions not read
          title: "Camera Issue",
          description: "Could not start analysis. Video dimensions were not available. Feed might be visible but analysis is off.",
        });
        // Do not call stopMonitoringInternal here necessarily, user might still see video
        // but setIsMonitoringActive remains false.
      };

      const handleVideoError = (e: Event) => {
        console.error("Video element error:", e);
        let description = "There was an error with the video stream.";
        if (videoElement.error) {
            description += ` Code: ${videoElement.error.code}, Message: ${videoElement.error.message}`;
        }
        toast({variant: "destructive", title: "Video Playback Error", description: description});
        stopMonitoringInternal();
      };
      
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('playing', startActiveMonitoringWithRetry);
      videoElement.addEventListener('canplay', startActiveMonitoringWithRetry);
      videoElement.addEventListener('error', handleVideoError);

      return () => {
        console.log("Cleaning up useEffect[mediaStream]. Old stream ID (if any):", streamToCleanUp?.id);
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('playing', startActiveMonitoringWithRetry);
        videoElement.removeEventListener('canplay', startActiveMonitoringWithRetry);
        videoElement.removeEventListener('error', handleVideoError);

        if (streamToCleanUp && videoElement.srcObject === streamToCleanUp) {
          streamToCleanUp.getTracks().forEach(track => track.stop());
          videoElement.srcObject = null; 
        }

        if (intervalIdRef.current) { 
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
        listenersAttachedRef.current = false; 
      };
    } else if (!mediaStream && videoRef.current && videoRef.current.srcObject) {
        // Fallback cleanup if mediaStream becomes null and srcObject still exists (e.g., after stopMonitoringInternal)
        const currentVideoSrcStream = videoRef.current.srcObject as MediaStream;
        currentVideoSrcStream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
        if (intervalIdRef.current) clearInterval(intervalIdRef.current);
        setIsMonitoringActive(false); // ensure this is false
        listenersAttachedRef.current = false;
    }
  }, [mediaStream, toast, captureAndAnalyzeFrame, stopMonitoringInternal]);


  useEffect(() => {
    return () => {
      console.log("EngagementMonitorPanel unmounting, ensuring monitoring is stopped.");
      stopMonitoringInternal(); // This will use the latest `stopMonitoringInternal` from its useCallback.
    };
  }, [stopMonitoringInternal]); // `stopMonitoringInternal` is stable.


  return (
    <Card className="w-full shadow-xl flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl">Engagement Monitor</CardTitle>
        <div className="flex items-center text-sm text-muted-foreground">
          {isMonitoringActive && !isLoadingAnalysis && <Dot className="h-5 w-5 text-green-500 animate-pulse mr-1" />}
          {(isLoadingAnalysis || (isInitializingCamera && !mediaStream)) && <Loader2 className="h-5 w-5 text-primary animate-spin mr-1" />}
          {isInitializingCamera ? 'Initializing Camera...' :
           isMonitoringActive ? (isLoadingAnalysis ? 'Analyzing...' : 'Monitoring') : 
           (hasCameraPermission === false ? 'Camera Error' : 'Not Monitoring')}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow flex flex-col">
        <canvas ref={canvasRef} className="hidden" />

        <div className="relative w-full aspect-video bg-slate-900 rounded-md border overflow-hidden">
            <video 
                ref={videoRef} 
                muted 
                playsInline 
                className={`w-full h-full object-cover ${ (mediaStream && hasCameraPermission === true) ? 'block' : 'hidden'}`} 
            />
            {!(mediaStream && hasCameraPermission === true) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                    {isInitializingCamera ? (
                        <>
                            <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                            <p className="text-muted-foreground">Initializing camera...</p>
                        </>
                    ) : hasCameraPermission === false ? (
                        <>
                            <VideoOff className="h-10 w-10 text-destructive mb-2" />
                            <p className="text-destructive font-semibold">Camera Access Failed</p>
                            <p className="text-xs text-muted-foreground">Check browser permissions and ensure no other app is using the camera.</p>
                        </>
                    ) : (
                         <>
                            <Video className="h-10 w-10 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">Camera feed will appear here.</p>
                         </>
                    )}
                </div>
            )}
        </div>

        {!isMonitoringActive && hasCameraPermission !== false && (
          <Button onClick={requestCameraAndStart} disabled={isInitializingCamera || isMonitoringActive} className="w-full mt-2">
            <Video className="mr-2 h-4 w-4" /> Enable Camera Monitoring
          </Button>
        )}
        
        {isMonitoringActive && (
          <Button onClick={stopMonitoringInternal} variant="outline" size="sm" className="w-full mt-2">
            <VideoOff className="mr-2 h-4 w-4" /> Stop Monitoring
          </Button>
        )}
        
        {hasCameraPermission === false && !isInitializingCamera && !isMonitoringActive && (
           <Alert variant="destructive" className="mt-4">
            <VideoOff className="h-4 w-4" />
            <AlertTitle>Camera Access Denied or Unavailable</AlertTitle>
            <AlertDescription>
              Please enable camera permissions in your browser settings and ensure your camera is connected and not in use by another application. Then, try enabling monitoring again.
            </AlertDescription>
           </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Analysis Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 mt-auto pt-4"> 
          <div>
            <div className="flex justify-between mb-1">
              <Label htmlFor="engagement-progress">Engagement</Label>
              <span className="text-sm font-medium text-primary">{scores.engagementScore.toFixed(0)}%</span>
            </div>
            <Progress id="engagement-progress" value={scores.engagementScore} className="w-full" aria-label={`Engagement level ${scores.engagementScore.toFixed(0)}%`} />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <Label htmlFor="attention-progress">Attention</Label>
              <span className="text-sm font-medium text-primary">{scores.attentionScore.toFixed(0)}%</span>
            </div>
            <Progress id="attention-progress" value={scores.attentionScore} className="w-full" aria-label={`Attention level ${scores.attentionScore.toFixed(0)}%`} />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <Label htmlFor="confusion-progress">Confusion</Label>
              <span className="text-sm font-medium text-primary">{scores.confusionScore.toFixed(0)}%</span>
            </div>
            <Progress id="confusion-progress" value={scores.confusionScore} className="w-full" aria-label={`Confusion level ${scores.confusionScore.toFixed(0)}%`} />
          </div>
        </div>
        <div className="pt-4 border-t">
          <h4 className="text-lg font-semibold mb-2 text-primary">Teaching Recommendation</h4>
          <p className="text-sm text-muted-foreground min-h-[40px]">
            {recommendation || (isMonitoringActive ? "Analyzing..." : "Enable monitoring to receive recommendations.")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
    

    