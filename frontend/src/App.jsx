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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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
    bg: mode === "education" ? "bg-orange-50/20" : "bg-teal-50/20",
    text: "text-slate-900",
    primary: mode === "education" ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-teal-600 hover:bg-teal-700 text-white",
    card: mode === "education" ? "bg-white border-orange-100" : "bg-white border-teal-100",
    fab: mode === "education" ? "bg-orange-500 hover:bg-orange-600 text-white ring-orange-200" : "bg-teal-600 hover:bg-teal-700 text-white ring-teal-200",
    bubbleUser: "bg-slate-950 text-slate-50 rounded-3xl rounded-tr-md px-4 py-2.5 text-base font-medium shadow-sm border border-slate-900/5",
    bubbleBot: mode === "education" ? "bg-orange-50/30 border border-orange-100/70 text-orange-950 rounded-3xl rounded-tl-md px-4 py-3 text-base shadow-sm" : "bg-teal-50/30 border border-teal-100/70 text-teal-950 rounded-3xl rounded-tl-md px-4 py-3 text-base shadow-sm",
    logoColor: mode === "education" ? "text-orange-600" : "text-teal-600"
  };

  return (
    <div className="min-h-screen w-screen bg-slate-100 flex items-center justify-center font-sans transition-colors duration-300 p-0 sm:p-4">
      {/* Sleek Mobile-First Centered App Container */}
      <div className="w-full h-screen sm:h-[820px] sm:max-w-[460px] sm:rounded-[36px] bg-slate-50 border border-slate-200/80 shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Sticky Top Navigation (Glassmorphism) */}
        <header className="h-16 border-b border-slate-200/60 px-4 flex items-center justify-between backdrop-blur-md bg-white/70 z-10 sticky top-0">
          {/* Logo */}
          <div className="flex items-center gap-1">
            <span className={`text-base font-bold tracking-tight ${theme.logoColor}`}>Sarathi</span>
          </div>

          {/* Mode Toggle Selector */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-full border border-slate-200/60 shadow-inner">
            <button
              onClick={() => setMode("education")}
              className={`flex items-center justify-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full transition-all duration-300 ${
                mode === "education"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              🎓 Shiksha
            </button>
            <button
              onClick={() => setMode("healthcare")}
              className={`flex items-center justify-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full transition-all duration-300 ${
                mode === "healthcare"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              ⚕️ Arogya
            </button>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1.5">
            {/* Globe selector */}
            <div className="relative">
              <Globe size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-slate-100 hover:bg-slate-200 border-0 rounded-full py-1 pl-6 pr-2.5 text-[10px] font-bold text-slate-700 focus:outline-none transition-colors cursor-pointer appearance-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Ingestion Trigger Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className={`p-1.5 rounded-full border hover:bg-slate-50 transition-colors relative ${
                uploadStatus === "success" 
                  ? (mode === "education" ? "border-orange-200 text-orange-600 bg-orange-50" : "border-teal-200 text-teal-600 bg-teal-50") 
                  : "border-slate-200 text-slate-500"
              }`}
              title="Knowledge Base / PDF"
            >
              <FileText size={15} />
              {uploadStatus === "success" && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse"></span>
              )}
            </button>
          </div>
        </header>

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-48">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-5 px-2 py-4">
              <div className={`p-4 rounded-3xl bg-white border shadow-sm ${
                mode === "education" ? "border-orange-100 text-orange-500" : "border-teal-100 text-teal-500"
              }`}>
                {mode === "education" ? (
                  <HelpCircle size={32} />
                ) : (
                  <Activity size={32} />
                )}
              </div>
              
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-800">
                  {mode === "education" ? "Shiksha AI Classroom Helper" : "Arogya Health Companion"}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-[280px] mx-auto">
                  {mode === "education" 
                    ? "Welcome to Shiksha Mode. Upload your textbook or lesson plan and start learning. Use voice input for quick questions."
                    : "Welcome to Arogya Mode. Upload your clinical diagnosis or report, and we will simplify it for you. Voice-first and non-diagnostic."
                  }
                </p>
              </div>

              {/* Suggestion Chips */}
              <div className="grid grid-cols-1 gap-2 pt-2 w-full max-w-[340px]">
                {((mode === "education" ? shikshaSuggestions : arogyaSuggestions) || SUGGESTIONS[mode]).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion)}
                    className={`text-left text-xs p-3.5 rounded-2xl border transition-all duration-300 ${theme.card} hover:shadow hover:border-slate-300 text-slate-700 font-medium`}
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
                className={`flex gap-2.5 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* Agent Avatar */}
                {msg.sender !== "user" && (
                  <div className={`h-8 w-8 rounded-xl shrink-0 flex items-center justify-center border shadow-sm ${
                    mode === "education" 
                      ? "bg-orange-100 border-orange-200 text-orange-600" 
                      : "bg-teal-100 border-teal-200 text-teal-600"
                  }`}>
                    {mode === "education" ? <BookOpen size={14} /> : <Stethoscope size={14} />}
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`max-w-[78%] border p-3.5 shadow-sm ${
                  msg.sender === "user"
                    ? theme.bubbleUser
                    : msg.sender === "system"
                    ? "bg-rose-50 border-rose-200 text-rose-950 rounded-3xl rounded-tl-md"
                    : theme.bubbleBot
                }`}>
                  <p className="whitespace-pre-line leading-relaxed text-sm">{msg.text}</p>
                  
                  {/* TTS Audio Trigger */}
                  {msg.sender === "assistant" && (
                    <div className={`mt-2.5 pt-2 border-t flex items-center justify-between ${
                      mode === "education" ? "border-orange-100" : "border-teal-100"
                    }`}>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Audio Playback</span>
                      <button
                        onClick={() => playTextToSpeech(msg.id, msg.text)}
                        disabled={playingMessageId !== null}
                        className={`p-1.5 rounded-lg transition-colors hover:bg-slate-100 ${
                          playingMessageId === msg.id 
                            ? "text-indigo-600 animate-pulse" 
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <Volume2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className={`h-8 w-8 rounded-xl shrink-0 flex items-center justify-center border animate-pulse ${
                mode === "education" ? "bg-orange-100 border-orange-200 text-orange-600" : "bg-teal-100 border-teal-200 text-teal-600"
              }`}>
                {mode === "education" ? <BookOpen size={14} /> : <Stethoscope size={14} />}
              </div>
              <div className={`rounded-3xl rounded-tl-md p-3.5 flex items-center gap-2 border shadow-sm ${theme.card}`}>
                <Loader2 size={14} className="animate-spin text-slate-400" />
                <span className="text-xs text-slate-500">Formulating response...</span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Dynamic Glowing Bottom Control Bar (Voice-First FAB) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent flex flex-col items-center pointer-events-none z-30">
          {isRecording && (
            <span className="mb-2 text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 shadow-sm animate-pulse">
              Recording... Tap Mic to Stop
            </span>
          )}

          <div className="w-full max-w-sm flex flex-col items-center gap-2.5 pointer-events-auto">
            
            {/* Huge Glowing Microphone Button */}
            <div className="relative">
              <button
                onClick={isRecording ? stopAudioRecording : startAudioRecording}
                className={`h-16 w-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 focus:outline-none ring-4 ${theme.fab} ${
                  isRecording 
                    ? "scale-110 ring-rose-200/90 shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse" 
                    : mode === "education"
                      ? "hover:scale-105 ring-orange-100/80 shadow-[0_0_15px_rgba(249,115,22,0.25)]"
                      : "hover:scale-105 ring-teal-100/80 shadow-[0_0_15px_rgba(13,148,136,0.25)]"
                }`}
              >
                {isRecording ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
              </button>
            </div>

            {/* Pill text field input */}
            <div className="w-full flex items-center bg-white border border-slate-200 rounded-full shadow p-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-300">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={isRecording ? "Transcribing speech..." : "Type or speak..."}
                className="flex-1 bg-transparent border-0 outline-none px-4 py-2 text-xs text-slate-800 placeholder-slate-400"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading || isRecording}
                className={`p-2 rounded-full transition-all duration-300 ${theme.primary} disabled:opacity-40 flex items-center justify-center shadow-sm`}
              >
                <Send size={12} />
              </button>
            </div>

          </div>
        </div>

        {/* Modal slide-up context sheet */}
        {isUploadModalOpen && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end transition-opacity duration-300">
            {/* Backdrop close area */}
            <div className="absolute inset-0" onClick={() => setIsUploadModalOpen(false)}></div>
            
            {/* Modal Body */}
            <div className="bg-white rounded-t-[32px] p-5 space-y-4 shadow-2xl relative z-10 max-h-[85%] overflow-y-auto transform transition-transform duration-300 border-t border-slate-100">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-2"></div>
              
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800">Knowledge Base Ingestion</h3>
                <button 
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full"
                >
                  Close
                </button>
              </div>

              {uploadStatus === "success" ? (
                <div className="flex flex-col items-center justify-center text-center p-5 space-y-3.5 border border-dashed border-emerald-200 bg-emerald-50/30 rounded-2xl">
                  <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
                    <CheckCircle size={24} />
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 break-all max-w-[260px]">
                      {uploadedFilename}
                    </h4>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
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
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline underline-offset-4 cursor-pointer pt-1"
                  >
                    Remove Document
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-50">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf"
                      className="hidden"
                    />
                    
                    <Upload 
                      size={28} 
                      className={`mb-2 ${
                        mode === "education" ? "text-orange-400" : "text-teal-500"
                      }`} 
                    />
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-4 cursor-pointer"
                    >
                      Choose PDF file
                    </button>
                    
                    {file ? (
                      <span className="text-[10px] text-slate-700 mt-2 font-medium truncate max-w-[220px]">
                        {file.name}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                        Upload textbook chapters or medical reports
                      </span>
                    )}
                  </div>

                  {file && (
                    <button
                      onClick={async () => {
                        await handleUpload();
                      }}
                      disabled={uploadStatus === "uploading"}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${theme.primary} disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm`}
                    >
                      {uploadStatus === "uploading" && <Loader2 size={12} className="animate-spin" />}
                      Ingest Document
                    </button>
                  )}

                  {uploadStatus === "error" && (
                    <div className="flex items-start gap-2 text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-600" />
                      <div className="text-[10px] leading-tight">
                        <p className="font-bold">Ingestion Failed</p>
                        <p className="text-slate-500 mt-0.5">{uploadError}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
