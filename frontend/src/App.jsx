import React, { useState, useRef, useEffect } from "react";
import { 
  BookOpen, 
  Stethoscope, 
  Upload, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  HelpCircle,
  Activity,
  Globe
} from "lucide-react";

// Determine API base URL dynamically based on environment configuration
const API_URL = import.meta.env.VITE_API_URL || "";

// Supported Indic languages for target translation
const LANGUAGES = [
  { code: "English", label: "English" },
  { code: "Kannada", label: "ಕನ್ನಡ (Kannada)" },
  { code: "Hindi", label: "हिन्दी (Hindi)" },
  { code: "Tamil", label: "தமிழ் (Tamil)" },
  { code: "Telugu", label: "తెలుగు (Telugu)" },
  { code: "Malayalam", label: "മലയാളം (Malayalam)" },
  { code: "Marathi", label: "मराठी (Marathi)" },
  { code: "Gujarati", label: "ગુજરાતી (Gujarati)" },
  { code: "Bengali", label: "বাংলা (Bengali)" },
  { code: "Punjabi", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "Odia", label: "ଓଡ଼ିଆ (Odia)" }
];

// Context-aware suggestion prompts for quick testing
const SUGGESTIONS = {
  education: [
    "Explain the solar system using a cricket match analogy.",
    "What is photosynthesis in simple terms?",
    "How does electricity flow through a wire?"
  ],
  healthcare: [
    "Explain what high cholesterol means for my daily diet.",
    "Simplify a clinical report showing mild hypertension.",
    "What precautions should be taken for type 2 diabetes?"
  ]
};

function App() {
  // App states
  const [mode, setMode] = useState("education"); // 'education' or 'healthcare'
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [shikshaMessages, setShikshaMessages] = useState([]);
  const [arogyaMessages, setArogyaMessages] = useState([]);
  const messages = mode === "education" ? shikshaMessages : arogyaMessages;
  const setMessages = (val) => {
    if (mode === "education") {
      setShikshaMessages(val);
    } else {
      setArogyaMessages(val);
    }
  };
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // File upload states
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle"); // 'idle' | 'uploading' | 'success' | 'error'
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [shikshaSuggestions, setShikshaSuggestions] = useState(null);
  const [arogyaSuggestions, setArogyaSuggestions] = useState(null);

  // Voice interaction states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [playingMessageId, setPlayingMessageId] = useState(null);

  // DOM Refs for scroll handling and input triggering
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to the bottom of the chat on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Initialize Web Speech API for real-time transcription
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      // Language mapper from selectedLanguage string to BCP-47
      const langMap = {
        "English": "en-IN",
        "Kannada": "kn-IN",
        "Hindi": "hi-IN",
        "Tamil": "ta-IN",
        "Telugu": "te-IN",
        "Malayalam": "ml-IN",
        "Marathi": "mr-IN",
        "Gujarati": "gu-IN",
        "Bengali": "bn-IN",
        "Punjabi": "pa-IN",
        "Odia": "or-IN"
      };

      recognition.lang = langMap[selectedLanguage] || "en-IN";

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputMessage(transcript);
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error:", e);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, [selectedLanguage]);

  // Handle PDF file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setUploadStatus("error");
        setUploadError("Please upload a PDF file only.");
        return;
      }
      setFile(selectedFile);
      setUploadStatus("idle");
    }
  };

  // Upload PDF to FastAPI's /api/upload endpoint
  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus("uploading");
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await response.json();
      setUploadStatus("success");
      setUploadedFilename(data.filename);
      if (data.suggestions && data.suggestions.length > 0) {
        if (mode === "education") {
          setShikshaSuggestions(data.suggestions);
        } else {
          setArogyaSuggestions(data.suggestions);
        }
      }
    } catch (err) {
      setUploadStatus("error");
      setUploadError(err.message || "An error occurred during file upload.");
    }
  };

  // Handle message sending
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    // Append user message locally
    const userMsg = { id: Date.now(), text, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    
    if (!textToSend) setInputMessage(""); // Clear text input if not clicked suggestion
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          mode: mode,
          language: selectedLanguage
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reach server");
      }

      const data = await response.json();
      
      const assistantMsg = {
        id: Date.now() + 1,
        text: data.response,
        sender: "assistant"
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        text: "Error: Unable to get a response from the server. Check your connection and configuration.",
        sender: "system"
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Browser Audio Recording for Speech-to-Text (STT)
  const startAudioRecording = async () => {
    if (recognitionRef.current) {
      try {
        setIsRecording(true);
        recognitionRef.current.start();
      } catch (err) {
        console.error("Recognition start error:", err);
      }
    } else {
      // Fallback to legacy audio recorder
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: "audio/wav" });
          await handleAudioUpload(audioBlob);
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access denied:", err);
        alert("Microphone access denied or device not supported.");
      }
    }
  };

  const stopAudioRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      // Clean up track bindings to release hardware mic
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Sends recorded audio blob to backend /api/stt endpoint (fallback)
  const handleAudioUpload = async (audioBlob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/stt`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("STT server error");

      const data = await response.json();
      // Populate text field with transcribed text and let user edit it (No auto-send)
      if (data.text) {
        setInputMessage(data.text);
      }
    } catch (err) {
      console.error("STT transaction failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // TTS audio playback handler
  const playTextToSpeech = async (msgId, text) => {
    setPlayingMessageId(msgId);
    try {
      const response = await fetch(`${API_URL}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          language: selectedLanguage,
        }),
      });

      if (!response.ok) throw new Error("TTS streaming failed");

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setPlayingMessageId(null);
      };
      
      await audio.play();
    } catch (err) {
      console.error("TTS output playback error:", err);
      setPlayingMessageId(null);
    }
  };

  // Define dynamic themes based on selected mode
  const theme = {
    bg: mode === "education" ? "bg-orange-50" : "bg-teal-50",
    text: mode === "education" ? "text-orange-950" : "text-teal-950",
    sidebar: mode === "education" ? "bg-orange-100/60 border-orange-200" : "bg-teal-100/60 border-teal-200",
    primary: mode === "education" ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-teal-600 hover:bg-teal-700 text-white",
    card: mode === "education" ? "bg-white border-orange-200" : "bg-white border-teal-200",
    fab: mode === "education" ? "bg-orange-500 hover:bg-orange-600 text-white ring-orange-300" : "bg-teal-600 hover:bg-teal-700 text-white ring-teal-300",
    bubbleUser: "bg-indigo-600 text-white border-indigo-700",
    bubbleBot: mode === "education" ? "bg-white border-orange-200 text-orange-950" : "bg-white border-teal-200 text-teal-950",
    inputBg: "bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500",
    logoColor: mode === "education" ? "text-orange-600" : "text-teal-600"
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme.bg} ${theme.text} font-sans transition-colors duration-300`}>
      
      {/* Sidebar - Control & File Upload Panel */}
      <div className={`w-80 flex flex-col border-r ${theme.sidebar} p-6 space-y-6 transition-all duration-300`}>
        
        {/* Logo and branding */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span className={`${theme.logoColor}`}>Sarathi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium uppercase tracking-wider">Sovereign Indic AI Copilot</p>
        </div>

        {/* PDF Document Ingestion Container */}
        <div className="flex-1 flex flex-col min-h-0 space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Knowledge Base PDF</label>
          <div className={`flex-1 border border-dashed border-slate-300 rounded-2xl p-4 flex flex-col justify-between ${theme.card} shadow-sm`}>
            
            {uploadStatus === "success" ? (
              /* Success/Active Document View */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4">
                <div className={`p-4 rounded-3xl ${
                  mode === "education" ? "bg-orange-50 text-orange-600 border border-orange-200" : "bg-teal-50 text-teal-600 border border-teal-200"
                } shadow-sm`}>
                  <FileText size={48} />
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 break-all max-w-[200px]">
                    {uploadedFilename}
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active Library Document
                  </span>
                </div>

                 <button 
                  onClick={() => {
                    setFile(null);
                    setUploadStatus("idle");
                    setUploadedFilename("");
                    if (mode === "education") {
                      setShikshaSuggestions(null);
                    } else {
                      setArogyaSuggestions(null);
                    }
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline underline-offset-4 cursor-pointer pt-2"
                >
                  Remove & Upload New
                </button>
              </div>
            ) : (
              /* Normal Upload Area */
              <>
                <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf"
                    className="hidden"
                  />
                  
                  <Upload 
                    size={32} 
                    className={`mb-3 ${
                      mode === "education" ? "text-orange-400" : "text-teal-500"
                    }`} 
                  />
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-4 cursor-pointer"
                  >
                    Choose PDF file
                  </button>
                  
                  {file ? (
                    <span className="text-xs text-slate-700 mt-2 font-medium truncate max-w-[200px]">
                      {file.name}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Upload textbook chapters or clinical documents
                    </span>
                  )}
                </div>

                {/* Upload Controls and Status Messaging */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  {file && (
                    <button
                      onClick={handleUpload}
                      disabled={uploadStatus === "uploading"}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${theme.primary} disabled:opacity-50 flex items-center justify-center gap-1.5`}
                    >
                      {uploadStatus === "uploading" && <Loader2 size={14} className="animate-spin" />}
                      Ingest Document
                    </button>
                  )}

                  {/* Error Notification */}
                  {uploadStatus === "error" && (
                    <div className="flex items-start gap-2 text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200">
                      <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                      <div className="text-xs leading-tight">
                        <p className="font-bold">Ingestion Failed</p>
                        <p className="text-slate-500 mt-0.5">{uploadError}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            
          </div>
        </div>

      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col bg-transparent relative">
        
        {/* Dynamic Mode Header with Glassmorphism */}
        <header className="h-16 border-b border-slate-200/60 px-8 flex items-center justify-between backdrop-blur-md bg-white/70 z-10 sticky top-0">
          
          {/* Mode Toggle Selector */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-full border border-slate-200 shadow-inner">
            <button
              onClick={() => setMode("education")}
              className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${
                mode === "education"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              🎓 Shiksha
            </button>
            <button
              onClick={() => setMode("healthcare")}
              className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${
                mode === "healthcare"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              ⚕️ Arogya
            </button>
          </div>

          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-slate-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-white border border-slate-200 rounded-full py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

        </header>

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 pb-36">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center space-y-6">
              <div className={`p-5 rounded-3xl bg-white border shadow-sm ${
                mode === "education" ? "border-orange-200 text-orange-500" : "border-teal-200 text-teal-500"
              }`}>
                {mode === "education" ? (
                  <HelpCircle size={40} />
                ) : (
                  <Activity size={40} />
                )}
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-800">
                  {mode === "education" ? "Shiksha AI Classroom Helper" : "Arogya Health Companion"}
                </h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {mode === "education" 
                    ? "Welcome to Shiksha Mode. Upload your textbook or lesson plan and start learning. Use voice input for quick questions."
                    : "Welcome to Arogya Mode. Upload your clinical diagnosis or report, and we will simplify it for you. Voice-first and non-diagnostic."
                  }
                </p>
              </div>

              {/* Suggestion Chips */}
              <div className="grid grid-cols-1 gap-2 pt-2 w-full">
                {((mode === "education" ? shikshaSuggestions : arogyaSuggestions) || SUGGESTIONS[mode]).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion)}
                    className={`text-left text-sm p-4 rounded-2xl border transition-all duration-300 ${theme.card} hover:shadow-md hover:border-slate-300 text-slate-700 font-medium`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* Agent Avatar */}
                {msg.sender !== "user" && (
                  <div className={`h-10 w-10 rounded-2xl shrink-0 flex items-center justify-center border shadow-sm ${
                    mode === "education" 
                      ? "bg-orange-100 border-orange-200 text-orange-600" 
                      : "bg-teal-100 border-teal-200 text-teal-600"
                  }`}>
                    {mode === "education" ? <BookOpen size={18} /> : <Stethoscope size={18} />}
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`max-w-xl rounded-2xl p-4 text-lg leading-relaxed border shadow-sm ${
                  msg.sender === "user"
                    ? theme.bubbleUser
                    : msg.sender === "system"
                    ? "bg-rose-50 border-rose-200 text-rose-950"
                    : theme.bubbleBot
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                  
                  {/* TTS Trigger Control for Assistant responses */}
                  {msg.sender === "assistant" && (
                    <div className={`mt-3 pt-3 border-t flex items-center justify-between ${
                      mode === "education" ? "border-orange-100" : "border-teal-100"
                    }`}>
                      <span className="text-xs text-slate-400 font-medium">Listen to response</span>
                      <button
                        onClick={() => playTextToSpeech(msg.id, msg.text)}
                        disabled={playingMessageId !== null}
                        className={`p-2 rounded-xl transition-colors hover:bg-slate-100 ${
                          playingMessageId === msg.id 
                            ? "text-indigo-600 animate-pulse" 
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.sender === "user" && (
                  <div className="h-10 w-10 rounded-2xl shrink-0 flex items-center justify-center bg-indigo-100 border border-indigo-200 text-indigo-600 shadow-sm">
                    <FileText size={18} />
                  </div>
                )}
              </div>
            ))
          )}
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className={`h-10 w-10 rounded-2xl shrink-0 flex items-center justify-center border animate-pulse ${
                mode === "education" ? "bg-orange-100 border-orange-200 text-orange-600" : "bg-teal-100 border-teal-200 text-teal-600"
              }`}>
                {mode === "education" ? <BookOpen size={18} /> : <Stethoscope size={18} />}
              </div>
              <div className={`rounded-2xl p-4 flex items-center gap-3 border shadow-sm ${theme.card}`}>
                <Loader2 size={18} className="animate-spin text-slate-400" />
                <span className="text-sm text-slate-500">Synthesizing translations...</span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Massive Voice-First Mic FAB and Input Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50/90 via-slate-50/50 to-transparent flex flex-col items-center pointer-events-none">
          <div className="w-full max-w-2xl flex items-center gap-3 pointer-events-auto">
            
            {/* Input field wrapper */}
            <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-2xl shadow-md p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-300">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={
                  isRecording 
                    ? "Listening..." 
                    : `Type or click mic to talk...`
                }
                disabled={false}
                className="flex-1 bg-transparent border-0 outline-none px-4 py-3 text-sm text-slate-800 placeholder-slate-400 disabled:opacity-50"
              />

              {/* Text Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading || isRecording}
                className={`p-3 rounded-xl transition-all duration-300 ${theme.primary} disabled:opacity-40 flex items-center justify-center shadow`}
              >
                <Send size={16} />
              </button>
            </div>

          </div>

          {/* Floating Action Button (FAB) for Voice-First Control */}
          <div className="mt-4 pointer-events-auto relative">
            <button
              onClick={isRecording ? stopAudioRecording : startAudioRecording}
              className={`h-20 w-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 focus:outline-none ring-4 ${theme.fab} ${
                isRecording ? "scale-110 animate-pulse ring-rose-400" : "scale-100 hover:scale-105"
              }`}
              title={isRecording ? "Stop recording" : "Record voice query"}
            >
              {isRecording ? <MicOff size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
            </button>
            {isRecording && (
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 whitespace-nowrap shadow-sm">
                Recording...
              </span>
            )}
          </div>

        </div>

      </div>
      
    </div>
  );
}

export default App;
