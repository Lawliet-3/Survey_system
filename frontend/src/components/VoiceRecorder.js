// src/components/VoiceRecorder.js
import React, { useState, useEffect, useRef } from 'react';
import './VoiceRecorder.css';
import api from '../services/api';

/**
 * Voice Recorder component with Google Speech-to-Text
 * @param {Object} props
 * @param {Function} props.onRecordingComplete - Callback that receives the audio blob
 * @param {Function} props.onTranscriptionComplete - Callback that receives the transcription text
 * @param {boolean} props.showTranscription - Whether to display transcription UI
 * @param {string} props.initialAudio - URL of initial audio to show in playback (if any)
 * @param {string} props.initialTranscript - Initial transcript text (if any)
 * @param {string} props.language - Language code for speech recognition (default: 'th-TH')
 */
const VoiceRecorder = ({ 
  onRecordingComplete, 
  onTranscriptionComplete = null,
  showTranscription = true,
  initialAudio = null,
  initialTranscript = '',
  language = 'th-TH',
  questionId = 'unknown'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioURL, setAudioURL] = useState(initialAudio);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState(initialTranscript);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [firebaseURL, setFirebaseURL] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  
  useEffect(() => {
    if (initialAudio) {
      console.log('Loading previous recording from URL:', initialAudio);
      setAudioURL(initialAudio);
      setFirebaseURL(initialAudio);
    }
  }, [initialAudio]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const uploadAudioToServer = async (blob, questionId) => {
    try {
      // Create a FormData object for the file upload
      const formData = new FormData();
      
      // Create a filename with question ID and timestamp
      const timestamp = new Date().getTime();
      const filename = `recording_${questionId}_${timestamp}.wav`;
      console.log(`Preparing to upload: filename=${filename}, question=${questionId}`);
      
      // Add the audio file with the filename
      formData.append('file', blob, filename);
      
      // Add metadata
      formData.append('question_id', questionId || 'unknown');
      formData.append('user_id', 'user_' + Math.random().toString(36).substring(2, 9));
      
      // Get the API URL from environment or use default
      // This addresses potential URL mismatch issues
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const backendUrl = `${apiBase}/api/upload-audio`;
      
      console.log(`Sending upload to: ${backendUrl}`);
      
      // Make a simple CORS preflight test
      try {
        console.log('Testing server connection...');
        const testResponse = await fetch(`${apiBase}/health`, {
          method: 'GET',
          mode: 'cors',
        });
        
        console.log(`Server health check status: ${testResponse.status}`);
        if (!testResponse.ok) {
          console.warn(`Server health check failed: ${testResponse.status}`);
        }
      } catch (corsTestError) {
        console.warn(`Server health check error: ${corsTestError.message}`);
      }
      
      // Make the API call to backend endpoint
      const response = await fetch(backendUrl, {
        method: 'POST',
        body: formData,
        // Remove explicit CORS mode to let the browser handle it automatically
        credentials: 'include', // Include credentials if needed
      });
      
      console.log(`Upload response status: ${response.status}`);
      
      // Parse response as JSON
      let result;
      try {
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        // Try to parse as JSON if possible
        try {
          result = JSON.parse(responseText);
        } catch (jsonError) {
          console.warn('Response is not valid JSON:', responseText);
          // Use a structured object instead
          result = { success: false, error: `Invalid JSON response: ${responseText}` };
        }
      } catch (readError) {
        console.error('Error reading response:', readError);
        throw new Error(`Could not read server response: ${readError.message}`);
      }
      
      // Fall back to local URL if the server response isn't OK
      if (!response.ok) {
        const errorMessage = result?.error || `Server responded with status: ${response.status}`;
        console.log(`Server error: ${errorMessage}`);
        throw new Error(errorMessage);
      }
      
      // Check if response contains a URL
      if (result && result.success && result.url) {
        console.log('Audio uploaded successfully, URL:', result.url);
        return result.url;
      } else {
        console.error('Server upload failed:', result?.error || 'No URL returned');
        
        // Try to get a more detailed error message if we can
        if (result && !result.url) {
          console.warn('Upload seemed to succeed but no URL was returned');
          // Try to do a Firebase test for more context
          try {
            const testResponse = await fetch(`${apiBase}/test-firebase`);
            const testResult = await testResponse.json();
            console.log('Firebase test result:', testResult);
          } catch (e) {
            console.warn('Could not run Firebase test:', e);
          }
        }
        
        // Use a local URL as fallback
        return URL.createObjectURL(blob);
      }
    } catch (error) {
      console.error('Error uploading audio to server:', error);
      
      // For now, just use a local URL as fallback
      console.log('Using local URL for audio');
      return URL.createObjectURL(blob);
    }
  };
  
  // Setup audio level visualization
  const setupAudioAnalysis = (stream) => {
    // Create audio context and analyzer
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    
    // Connect the audio stream to the analyzer
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    // Configure analyzer
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Save references
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    
    // Start monitoring audio levels
    const getAudioLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Normalize to 0-100 range
      const level = Math.min(100, average * 2);
      setAudioLevel(level);
      
      if (isRecording && !isPaused) {
        requestAnimationFrame(getAudioLevel);
      }
    };
    
    requestAnimationFrame(getAudioLevel);
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Reset state
      setAudioURL(null);
      setRecordingTime(0);
      setTranscript('');
      setErrorMessage('');
      audioChunksRef.current = [];
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      mediaStreamRef.current = stream;
      
      // Setup audio level visualization
      setupAudioAnalysis(stream);
      
      // Try to use optimal format for audio recording
      let options;
      try {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = {
            mimeType: 'audio/webm',
            audioBitsPerSecond: 16000
          };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = {
            mimeType: 'audio/mp4',
            audioBitsPerSecond: 16000
          };
        }
        
        mediaRecorderRef.current = options ? 
          new MediaRecorder(stream, options) : 
          new MediaRecorder(stream);
            
        console.log("Using audio format:", 
          mediaRecorderRef.current.mimeType || "default");
      } catch (e) {
        console.warn('Preferred format not supported, using default', e);
        mediaRecorderRef.current = new MediaRecorder(stream);
      }
      
      // Set up event handlers
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        // Create blob from chunks
        const blob = new Blob(audioChunksRef.current, { 
          type: mediaRecorderRef.current.mimeType || 'audio/wav' 
        });
        
        // Create local URL for immediate playback
        const localUrl = URL.createObjectURL(blob);
        setAudioURL(localUrl);
        
        try {
          // First upload to server
          console.log(`Recording stopped, uploading audio for question ${questionId}...`);
          const serverUrl = await uploadAudioToServer(blob, questionId);
          
          const finalUrl = serverUrl || localUrl;

          // Log whether upload was successful
          if (serverUrl) {
            console.log(`Server upload successful, received URL: ${serverUrl}`);
            setFirebaseURL(serverUrl);
          } else {
            console.warn('Server upload failed, using local URL for now');
            setFirebaseURL(localUrl);
          }
          
          // Then handle transcription - this can happen in parallel
          console.log('Starting transcription...');
          let transcriptionResult = "";

          if (showTranscription) {
            const result = await api.survey.transcribeAudio(blob, language);
            transcriptionResult = result.transcript !== undefined ? result.transcript : "";
            
            // Update the transcript state
            setTranscript(transcriptionResult);
            console.log(`Transcription result: "${transcriptionResult}"`);
          }
          
          if (onTranscriptionComplete) {
            console.log(`Notifying parent with transcription "${transcriptionResult}" and URL ${finalUrl}`);
            onTranscriptionComplete(transcriptionResult, finalUrl);
          }
          
          // Also call onRecordingComplete if provided
          if (onRecordingComplete) {
            onRecordingComplete(blob, finalUrl);
          }
        } catch (error) {
          console.error('Error in recording completion handler:', error);
          setErrorMessage('Failed to process recording. Please try again.');
          
          // Fall back to local URL for everything
          if (onTranscriptionComplete) {
            onTranscriptionComplete(transcript, localUrl);
          }
        }
        
        // Stop tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorderRef.current.start(100); // Capture in 100ms chunks
      setIsRecording(true);
      setIsPaused(false);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setErrorMessage(`Could not access microphone: ${error.message}`);
    }
  };
  
  // Pause recording
  const pauseRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
    
    mediaRecorderRef.current.pause();
    setIsPaused(true);
    clearInterval(timerRef.current);
  };
  
  // Resume recording
  const resumeRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'paused') return;
    
    mediaRecorderRef.current.resume();
    setIsPaused(false);
    
    // Restart timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };
  
  // Stop recording
  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };
  
  // Transcribe audio using Google Speech-to-Text
  const transcribeAudio = async (audioBlob) => {
    // This now just handles UI/state updates but doesn't call onTranscriptionComplete
    if (!showTranscription) return;
    
    try {
      setIsTranscribing(true);
      setErrorMessage('');
      
      console.log("Transcribing audio...");
      const result = await api.survey.transcribeAudio(audioBlob, language);
      
      // Just update the local state
      const transcription = result.transcript !== undefined ? result.transcript : "";
      setTranscript(transcription);

      if (onTranscriptionComplete) {
      console.log(`Notifying parent of transcription: "${transcription}"`);
      onTranscriptionComplete(transcription, firebaseURL || audioURL);
    }

      return transcription;
    } catch (error) {
      console.error('Transcription error:', error);
      setErrorMessage(`Error during transcription: ${error.message}`);
      return "";
    } finally {
      setIsTranscribing(false);
    }
  };
  
  // Check server status
  const checkServerStatus = async () => {
    try {
      const result = await api.survey.checkTranscriptionStatus();
      alert(`Server Status: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error('Error checking server status:', error);
      alert(`Error checking server status: ${error.message}`);
    }
  };
  
  // Handle manual transcript edits
  const handleTranscriptEdit = (e) => {
    const newText = e.target.value;
    setTranscript(newText);
    
    if (onTranscriptionComplete && firebaseURL) {
      // Always include the Firebase URL when transcript changes
      onTranscriptionComplete(newText, firebaseURL);
    } else if (onTranscriptionComplete) {
      onTranscriptionComplete(newText, null);
    }
  };

  return (
    <div className="voice-recorder">
      <div className="recorder-container">
        {/* Audio level indicator */}
        <div className="audio-level-container">
          <div 
            className="audio-level-indicator" 
            style={{ height: `${audioLevel}%` }}
          ></div>
        </div>
        
        {/* Timer display */}
        <div className="timer-display">
          {formatTime(recordingTime)}
        </div>
        
        {/* Control buttons */}
        <div className="control-buttons">
          {!isRecording && !audioURL && (
            <button className="record-button" onClick={startRecording}>
              <span className="record-icon"></span>
              Start Recording
            </button>
          )}
          
          {isRecording && !isPaused && (
            <>
              <button className="pause-button" onClick={pauseRecording}>
                <span className="pause-icon"></span>
                Pause
              </button>
              <button className="stop-button" onClick={stopRecording}>
                <span className="stop-icon"></span>
                Stop
              </button>
            </>
          )}
          
          {isRecording && isPaused && (
            <>
              <button className="resume-button" onClick={resumeRecording}>
                <span className="resume-icon"></span>
                Resume
              </button>
              <button className="stop-button" onClick={stopRecording}>
                <span className="stop-icon"></span>
                Stop
              </button>
            </>
          )}
          
          {audioURL && (
            <button className="record-again-button" onClick={startRecording}>
              <span className="record-again-icon"></span>
              Record Again
            </button>
          )}
        </div>
      </div>
      
      {/* Audio playback */}
      {audioURL && (
        <div className="audio-playback">
          <audio src={audioURL} controls></audio>
        </div>
      )}
      
      {/* Transcription section */}
      {showTranscription && (
        <div className="transcription-section">
          <h4>Transcription</h4>
          {isTranscribing ? (
            <div className="transcribing-indicator">
              <div className="spinner"></div>
              Transcribing your audio...
            </div>
          ) : (
            <>
              <textarea
                className="transcript-text"
                value={transcript}
                onChange={handleTranscriptEdit}
                placeholder="Transcription will appear here..."
                rows={4}
              />
              
              {errorMessage && (
                <div className="voice-input-error">
                  {errorMessage}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;