import React, { useState, useEffect } from "react";
import { 
  googleSignIn, logout, initAuth, getAccessToken 
} from "../googleAuth";
import { User } from "firebase/auth";
import { 
  Mail, MessageSquare, Users, Shield, LogOut, ArrowRight, 
  Send, RefreshCw, Search, Plus, Calendar, Clock, Eye, Trash, 
  CheckCircle, ChevronRight, Sparkles, UserPlus, Folder, Presentation, FileText, ChevronLeft, HardDrive
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { addTransaction } from "../firebaseService";

export default function GoogleWorkspace() {
  // Auth states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  // Workspace sub-tabs: 'chat' | 'contacts' | 'gmail' | 'drive' | 'slides'
  const [wsTab, setWsTab] = useState<'chat' | 'contacts' | 'gmail' | 'drive' | 'slides'>('contacts');

  // Loading indicator for API requests
  const [apiLoading, setApiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  
  const [spaces, setSpaces] = useState<any[]>([]);
  const [currentSpace, setCurrentSpace] = useState<any | null>(null);
  const [spaceMessages, setSpaceMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState("");

  const [emails, setEmails] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [composeEmail, setComposeEmail] = useState({ to: "", subject: "", body: "" });

  // Drive API States
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [driveSearch, setDriveSearch] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");

  // Slides API States
  const [presentations, setPresentations] = useState<any[]>([]);
  const [currentPresentation, setCurrentPresentation] = useState<any | null>(null);
  const [newPresTitle, setNewPresTitle] = useState("");

  // Confirmation dialog state for destructive/mutational actions
  const [confirmData, setConfirmData] = useState<{
    show: boolean;
    title: string;
    description: string;
    actionType: 'send_email' | 'post_chat';
    payload: any;
  } | null>(null);

  // Initialize Authentication State Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        setNeedsAuth(false);
        setAuthLoading(false);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
        setAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch data automatically when auth changes and when switching sub-tabs
  useEffect(() => {
    if (accessToken && !needsAuth) {
      if (wsTab === 'contacts') {
        fetchContacts();
      } else if (wsTab === 'chat') {
        fetchSpaces();
      } else if (wsTab === 'gmail') {
        fetchEmails();
      } else if (wsTab === 'drive') {
        fetchDriveFiles();
      } else if (wsTab === 'slides') {
        fetchPresentations();
      }
    }
  }, [accessToken, needsAuth, wsTab]);

  // Google Sign-In Trigger
  const handleLogin = async () => {
    setAuthLoading(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error("Auth Failure:", err);
      setErrorMessage("Google Sign-in failed. Please verify permission settings.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      setAccessToken(null);
      setNeedsAuth(true);
      // Reset state variables
      setContacts([]);
      setSpaces([]);
      setCurrentSpace(null);
      setSpaceMessages([]);
      setEmails([]);
      setDriveFiles([]);
      setPresentations([]);
      setCurrentPresentation(null);
    } catch (err) {
      console.error(err);
    }
  };

  // 1. CHAT API INTEGRATIONS
  const fetchSpaces = async () => {
    if (!accessToken) return;
    setApiLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("https://chat.googleapis.com/v1/spaces", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Google Chat API return code ${res.status}`);
      const data = await res.json();
      setSpaces(data.spaces || []);
    } catch (err: any) {
      setErrorMessage("Could not list Google Chat Spaces. Ensure your account is authorized to view Chat.");
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  const fetchSpaceMessages = async (spaceName: string) => {
    if (!accessToken) return;
    setApiLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Google Chat API return code ${res.status}`);
      const data = await res.json();
      setSpaceMessages(data.messages || []);
    } catch (err: any) {
      setErrorMessage("Could not fetch messages for this Space.");
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  const handleSelectSpace = (space: any) => {
    setCurrentSpace(space);
    fetchSpaceMessages(space.name);
  };

  const triggerPostMessage = () => {
    if (!newMessageText.trim() || !currentSpace) return;
    
    // Explicit safety assurance confirmation before sending chat messages
    setConfirmData({
      show: true,
      title: "Post Live Chat Message?",
      description: `You are about to transmit a real-time message to "${currentSpace.displayName || currentSpace.name}" on Google Chat.`,
      actionType: 'post_chat',
      payload: { spaceName: currentSpace.name, text: newMessageText.trim() }
    });
  };

  const executePostMessage = async (payload: { spaceName: string; text: string }) => {
    if (!accessToken) return;
    setApiLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${payload.spaceName}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: payload.text })
      });
      if (!res.ok) throw new Error(`Chat post returned ${res.status}`);
      setNewMessageText("");
      showSuccessFeedback("Message sent to Google Chat!");
      fetchSpaceMessages(payload.spaceName);
    } catch (err: any) {
      setErrorMessage("Failed to send Google Chat message. Ensure you have spacing access.");
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  // 2. CONTACTS (PEOPLE API) INTEGRATIONS
  const fetchContacts = async () => {
    if (!accessToken) return;
    setApiLoading(true);
    setErrorMessage(null);
    try {
      // Fetch user's Google connections
      const res = await fetch(
        "https://people.googleapis.com/v1/people/me/connections?pageSize=100&personFields=names,emailAddresses,phoneNumbers,photos",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!res.ok) throw new Error(`People API status code ${res.status}`);
      const data = await res.json();
      setContacts(data.connections || []);
    } catch (err: any) {
      setErrorMessage("Failed to fetch Google Contacts. Make sure the People API is enabled.");
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  // 3. GMAIL INTEGRATIONS
  const fetchEmails = async () => {
    if (!accessToken) return;
    setApiLoading(true);
    setErrorMessage(null);
    try {
      // Fetch messages list
      const listRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!listRes.ok) throw new Error(`Gmail API retrieval code ${listRes.status}`);
      const listData = await listRes.json();
      
      if (!listData.messages || listData.messages.length === 0) {
        setEmails([]);
        return;
      }

      // Fetch detail payloads concurrently
      const detailPromises = listData.messages.map(async (msg: any) => {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!detailRes.ok) return null;
        return detailRes.json();
      });

      const detailResults = await Promise.all(detailPromises);
      const processedEmails = detailResults
        .filter(r => r !== null)
        .map((email: any) => {
          const headers = email.payload?.headers || [];
          const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
          const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown Sender";
          const date = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";
          
          return {
            id: email.id,
            snippet: email.snippet,
            subject,
            from,
            date,
            threadId: email.threadId,
            body: email.snippet // simplistic content representation
          };
        });

      setEmails(processedEmails);
    } catch (err: any) {
      setErrorMessage("Could not recover secure Gmail list. Review credentials scope.");
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  const triggerSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeEmail.to || !composeEmail.subject || !composeEmail.body) return;

    // MANDATORY explicit user confirmation before sending email on behalf of user
    setConfirmData({
      show: true,
      title: "Confirm Email Dispatch?",
      description: `You are about to transmit a secure Gmail message to "${composeEmail.to}". Subject: "${composeEmail.subject}".`,
      actionType: 'send_email',
      payload: composeEmail
    });
  };

  const executeSendEmail = async (payload: typeof composeEmail) => {
    if (!accessToken) return;
    setApiLoading(true);
    setErrorMessage(null);
    try {
      // Prepare RFC822 compliant email body in Base64
      const rfcEncodedEmail = [
        `To: ${payload.to}`,
        `Subject: ${payload.subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset="utf-8"`,
        ``,
        payload.body
      ].join("\n");

      // Gmail API requires url-safe base64 encoding
      const utf8Encoder = new TextEncoder();
      const bytes = utf8Encoder.encode(rfcEncodedEmail);
      let binary = "";
      bytes.forEach(b => binary += String.fromCharCode(b));
      const base64Encoded = btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: base64Encoded })
      });

      if (!res.ok) throw new Error(`Gmail API returned status ${res.status}`);
      
      setComposeEmail({ to: "", subject: "", body: "" });
      showSuccessFeedback("Email transmitted successfully via Gmail!");
      fetchEmails();
    } catch (err: any) {
      setErrorMessage("Failed to dispatch Gmail. Verify recipient address.");
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  // 4. GOOGLE DRIVE API INTEGRATIONS
  const fetchDriveFiles = async () => {
    if (!accessToken) return;
    setApiLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        "https://www.googleapis.com/drive/v3/files?pageSize=30&fields=files(id,name,mimeType,iconLink,webViewLink,size,createdTime)",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error(`Drive list error: ${res.status}`);
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (err: any) {
      setErrorMessage("Unable to retrieve Google Drive files. Review authorization.");
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  const createDriveFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newFileName.trim()) return;
    setApiLoading(true);
    setErrorMessage(null);
    try {
      // Create metadata
      const res = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newFileName.trim() + ".txt",
          mimeType: "text/plain"
        })
      });
      if (!res.ok) throw new Error(`Drive file creation returned ${res.status}`);
      const file = await res.json();

      // If user provided content, update file content
      if (newFileContent.trim() && file.id) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "text/plain"
          },
          body: newFileContent
        });
      }

      // Sync transaction / action event to FireStore
      if (currentUser?.uid) {
        const txId = `tx_drv_${Math.random().toString(36).substring(2, 11)}`;
        await addTransaction(currentUser.uid, {
          id: txId,
          type: "vip_purchase",
          amount: 0,
          description: `Drive document initialized: "${newFileName}.txt"`,
          timestamp: new Date().toISOString(),
          status: "Success"
        });
      }

      setNewFileName("");
      setNewFileContent("");
      showSuccessFeedback(`Created plain-text document in Google Drive! Synced to Cloud Firestore.`);
      fetchDriveFiles();
    } catch (err: any) {
      setErrorMessage("Could not create text document in Google Drive.");
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  const deleteDriveFile = async (id: string, name: string) => {
    if (!accessToken) return;
    setApiLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error(`Drive delete returned ${res.status}`);
      showSuccessFeedback(`Permanently deleted "${name}" from Google Drive.`);
      fetchDriveFiles();
    } catch (err: any) {
      setErrorMessage("Failed to delete the selected Google Drive file.");
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  // 5. GOOGLE SLIDES API INTEGRATIONS
  const fetchPresentations = async () => {
    if (!accessToken) return;
    setApiLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=mimeType%3D'application%2Fvnd.google-apps.presentation'&pageSize=20&fields=files(id,name,mimeType,createdTime)",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error(`Drive presentation query status ${res.status}`);
      const data = await res.json();
      setPresentations(data.files || []);
    } catch (err: any) {
      setErrorMessage("Could not fetch presentation libraries from Google Drive.");
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  const fetchPresentationDetails = async (id: string) => {
    if (!accessToken) return;
    setApiLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`https://slides.googleapis.com/v1/presentations/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error(`Slides details returned ${res.status}`);
      const data = await res.json();
      setCurrentPresentation(data);
    } catch (err: any) {
      setErrorMessage("Unable to fetch slide design/structure layers.");
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  const createPresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newPresTitle.trim()) return;
    setApiLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("https://slides.googleapis.com/v1/presentations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: newPresTitle.trim() })
      });
      if (!res.ok) throw new Error(`Slide builder standard error ${res.status}`);
      const pres = await res.json();

      // Batch update to append a welcome layout slide
      await fetch(`https://slides.googleapis.com/v1/presentations/${pres.presentationId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requests: [
            {
              createSlide: {
                insertionIndex: 1,
                slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" }
              }
            }
          ]
        })
      });

      // Log Slide deck creation to FireStore
      if (currentUser?.uid) {
        const txId = `tx_sld_${Math.random().toString(36).substring(2, 11)}`;
        await addTransaction(currentUser.uid, {
          id: txId,
          type: "vip_purchase",
          amount: 0,
          description: `Presentation workspace designed: "${newPresTitle}"`,
          timestamp: new Date().toISOString(),
          status: "Success"
        });
      }

      setNewPresTitle("");
      showSuccessFeedback(`Successfully generated new Google Presentation! Synced to Cloud Firestore.`);
      fetchPresentations();
    } catch (err: any) {
      setErrorMessage("Could not create Slides presentation deck.");
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  // Confirm and proceed handler
  const handleConfirmAction = () => {
    if (!confirmData) return;
    const { actionType, payload } = confirmData;
    setConfirmData(null);
    
    if (actionType === 'send_email') {
      executeSendEmail(payload);
    } else if (actionType === 'post_chat') {
      executePostMessage(payload);
    }
  };

  const showSuccessFeedback = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // Extract contact fields helper
  const getContactFields = (person: any) => {
    const nameObj = person.names?.[0] || {};
    const emailObj = person.emailAddresses?.[0] || {};
    const phoneObj = person.phoneNumbers?.[0] || {};
    const photoObj = person.photos?.[0] || {};

    return {
      name: nameObj.displayName || "Unnamed Connection",
      email: emailObj.value || null,
      phone: phoneObj.value || null,
      photo: photoObj.url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
    };
  };

  // Filter contacts by query
  const filteredContacts = contacts.filter(person => {
    const { name, email } = getContactFields(person);
    return name.toLowerCase().includes(contactSearch.toLowerCase()) || 
           (email && email.toLowerCase().includes(contactSearch.toLowerCase()));
  });

  return (
    <div className="bg-obsidian-900 border border-obsidian-850 rounded-3xl overflow-hidden p-6 relative min-h-[500px]">
      
      {/* Visual background atmospheric effects */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gold-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Sync Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-obsidian-800 pb-5 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" />
            <span className="text-rose-500 font-mono text-[10px] font-extrabold uppercase tracking-widest leading-none">Workspace Core Integration</span>
          </div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight leading-none">
            Google Suite Portal
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Connect Google Chat, Contacts, & Gmail directly to coordinate network activities safely.
          </p>
        </div>

        {/* Global Sync Status or Auth states */}
        {!needsAuth && currentUser && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-obsidian-950 px-3 py-1.5 rounded-xl border border-obsidian-800">
              <img 
                src={currentUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=50"} 
                alt="user" 
                className="w-5 h-5 rounded-full object-cover border border-white/10"
                referrerPolicy="no-referrer"
              />
              <div className="leading-none text-left">
                <span className="text-white text-xs font-bold font-display block">{currentUser.displayName || currentUser.email}</span>
                <span className="text-[9px] text-emerald-400 font-bold tracking-wider">● CONNECTED</span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-obsidian-800 text-gray-400 hover:text-red-400 hover:bg-red-950/20 border border-obsidian-750 transition"
              title="Disconnect Google Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ERROR / SUCCESS NOTIFIER BAR */}
      {errorMessage && (
        <div id="workspace-error" className="mb-4 p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-200 text-xs flex items-center gap-2">
          <span className="shrink-0 font-bold block">⚠️ Error:</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div id="workspace-success" className="mb-4 p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
          <span className="shrink-0 font-bold block">✓ Success:</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* AUTH SCREEN IF NOT LOGGED IN */}
      {needsAuth ? (
        <div className="text-center py-20 flex flex-col items-center justify-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-500 p-[1px] flex items-center justify-center mb-6">
            <div className="w-full h-full bg-obsidian-900 rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-rose-500" />
            </div>
          </div>
          
          <h3 className="font-display font-extrabold text-white text-lg tracking-tight">
            Enable Google Workspace Sync
          </h3>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            Authorize connection to fetch verified contacts, send safe Gmail interactions, and handle live Google Chat Spaces instantly.
          </p>

          <button 
            onClick={handleLogin}
            disabled={authLoading}
            className="mt-8 flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 border border-obsidian-750 bg-white text-neutral-800 hover:bg-neutral-100 disabled:opacity-50 hover:shadow-lg hover:shadow-white/5 active:scale-95"
          >
            {authLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-neutral-600" />
            ) : (
              <>
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0 block">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>Authorize with Google Account</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* CORE WORKSPACE ENVIRONMENT WITH SUB-TABS NAVIGATION */
        <div>
          {/* Sub Navigation */}
          <div className="flex gap-2 p-1 bg-obsidian-950 border border-obsidian-850 rounded-xl mb-6 overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setWsTab('contacts')}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 ${
                wsTab === 'contacts' 
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Contacts ({contacts.length})
            </button>
            <button
              onClick={() => setWsTab('chat')}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 ${
                wsTab === 'chat' 
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Google Chat ({spaces.length})
            </button>
            <button
              onClick={() => setWsTab('gmail')}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 ${
                wsTab === 'gmail' 
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Gmail ({emails.length})
            </button>
            <button
              onClick={() => setWsTab('drive')}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 ${
                wsTab === 'drive' 
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              Drive ({driveFiles.length})
            </button>
            <button
              onClick={() => setWsTab('slides')}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 ${
                wsTab === 'slides' 
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              Slides ({presentations.length})
            </button>
          </div>

          {/* ACTIVE WORKSPACE SUB-VIEW */}
          {apiLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-gray-500 font-mono">
              <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
              <span>Fetching premium stream from Google cloud...</span>
            </div>
          )}

          {!apiLoading && (
            <AnimatePresence mode="wait">
              
              {/* SUB-VIEW A: CONTACTS LISTING */}
              {wsTab === 'contacts' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  key="contacts_tab"
                  className="space-y-4"
                >
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search contact names or address..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="w-full bg-obsidian-950 border border-obsidian-750 pl-10 pr-4 py-2 text-white text-xs rounded-xl outline-none focus:border-rose-500/50"
                      />
                    </div>
                    <button
                      onClick={fetchContacts}
                      className="p-2.5 rounded-xl bg-obsidian-950 border border-obsidian-750 text-gray-400 hover:text-white"
                      title="Reload Contacts"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-obsidian-800 rounded-2xl">
                      <Users className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                      <p className="text-xs text-gray-500">No matching Google Contacts detected.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredContacts.map((person, idx) => {
                        const { name, email, phone, photo } = getContactFields(person);
                        return (
                          <div 
                            key={idx} 
                            className="p-3.5 bg-obsidian-950/80 hover:bg-obsidian-950 border border-obsidian-800 rounded-2xl flex items-center justify-between gap-3 group transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img 
                                src={photo} 
                                alt={name} 
                                className="w-10 h-10 rounded-full object-cover border border-white/5"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0 text-left">
                                <h4 className="text-xs font-bold text-white font-display truncate leading-tight group-hover:text-rose-400 transition-colors">
                                  {name}
                                </h4>
                                {email && (
                                  <p className="text-[10px] text-gray-400 truncate mt-0.5 font-mono">{email}</p>
                                )}
                                {phone && (
                                  <p className="text-[9px] text-gray-500 truncate mt-0.5">{phone}</p>
                                )}
                              </div>
                            </div>

                            {/* Direct Actions */}
                            <div className="flex gap-1 shrink-0">
                              {email && (
                                <button
                                  onClick={() => {
                                    setWsTab('gmail');
                                    setComposeEmail(prev => ({ ...prev, to: email }));
                                  }}
                                  className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition"
                                  title={`Compose Gmail to ${name}`}
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* SUB-VIEW B: GOOGLE CHAT APPS */}
              {wsTab === 'chat' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  key="chat_tab"
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                >
                  {/* Spaces side-rail */}
                  <div className="lg:col-span-4 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-obsidian-850">
                      <span className="text-xs font-bold text-gray-400 font-display">AVAILABLE CHAT SPACES</span>
                      <button 
                        onClick={fetchSpaces} 
                        className="text-[10px] text-rose-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Sync Range
                      </button>
                    </div>

                    {spaces.length === 0 ? (
                      <div className="text-center py-10 bg-obsidian-950/40 rounded-2xl border border-obsidian-800">
                        <p className="text-xs text-gray-500">No active chat spaces available.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                        {spaces.map((space, idx) => {
                          const isSelected = currentSpace?.name === space.name;
                          return (
                            <button
                              key={idx}
                              onClick={() => handleSelectSpace(space)}
                              className={`w-full p-3 rounded-xl text-left text-xs transition duration-150 flex items-center justify-between border ${
                                isSelected 
                                  ? "bg-rose-500/10 border-rose-500/40 text-white" 
                                  : "bg-obsidian-950/65 border-obsidian-800/80 text-gray-400 hover:bg-obsidian-950"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <MessageSquare className={`w-4 h-4 ${isSelected ? 'text-rose-400' : 'text-gray-500'}`} />
                                <span className="font-semibold font-display truncate">
                                  {space.displayName || "Direct Stream"}
                                </span>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Message workspace */}
                  <div className="lg:col-span-8 bg-obsidian-950 border border-obsidian-800 rounded-2xl p-4 flex flex-col h-[400px]">
                    {currentSpace ? (
                      <div className="flex flex-col h-full justify-between">
                        {/* Space label */}
                        <div className="pb-3 border-b border-obsidian-850 flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-bold text-white font-display">
                              💬 {currentSpace.displayName || "Direct Stream"}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">{currentSpace.name}</p>
                          </div>
                          <button
                            onClick={() => fetchSpaceMessages(currentSpace.name)}
                            className="p-1 px-2 rounded-lg bg-obsidian-900 text-gray-400 text-[10px] hover:text-white border border-obsidian-800"
                          >
                            Refresh Live Messages
                          </button>
                        </div>

                        {/* Message log entries */}
                        <div className="flex-grow my-4 overflow-y-auto space-y-3 pr-2 scrollbar">
                          {spaceMessages.length === 0 ? (
                            <div className="text-center py-16 text-gray-600 text-xs">
                              <p>No transactions log. Type below to transmit first message.</p>
                            </div>
                          ) : (
                            spaceMessages.map((msg, midx) => (
                              <div key={midx} className="text-left text-xs bg-obsidian-900 border border-obsidian-850 p-2.5 rounded-xl max-w-[80%]">
                                <div className="flex items-center gap-2 mb-1 justify-between">
                                  <span className="font-bold text-rose-400 font-display">
                                    {msg.sender?.displayName || "Google User"}
                                  </span>
                                  <span className="text-[9px] text-gray-600 font-mono">
                                    {msg.createTime ? new Date(msg.createTime).toLocaleTimeString() : ""}
                                  </span>
                                </div>
                                <p className="text-gray-200">{msg.text}</p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Form submit */}
                        <div className="pt-3 border-t border-obsidian-850 flex gap-2">
                          <input
                            type="text"
                            placeholder="Type Google Chat message..."
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                triggerPostMessage();
                              }
                            }}
                            className="flex-grow bg-obsidian-900 border border-obsidian-800 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-rose-500/40"
                          />
                          <button
                            onClick={triggerPostMessage}
                            disabled={!newMessageText.trim()}
                            className="p-2.5 px-4 rounded-xl text-xs font-bold bg-rose-500 text-white font-display hover:bg-rose-600 duration-150 flex items-center gap-1.5 disabled:opacity-40"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Send
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center py-20 text-xs text-gray-500 p-6">
                        <MessageSquare className="w-8 h-8 text-gray-700 mb-2" />
                        <h4 className="font-bold text-gray-400">No Chat Space Selected</h4>
                        <p className="mt-1">Pick a workspace from the side panel listing to read and send messages.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* SUB-VIEW C: GMAIL INTEGRATION */}
              {wsTab === 'gmail' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  key="gmail_tab"
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                >
                  {/* Email Composers */}
                  <div className="lg:col-span-5 bg-obsidian-950/80 border border-obsidian-800/80 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 pb-3 border-b border-obsidian-850 mb-4">
                      <Plus className="w-4 h-4 text-rose-500" />
                      <h4 className="text-xs font-bold text-white uppercase font-display">Compose Gmail Interaction</h4>
                    </div>

                    <form onSubmit={triggerSendEmail} className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">To (Email Address)</label>
                        <input
                          type="email"
                          required
                          value={composeEmail.to}
                          onChange={(e) => setComposeEmail(prev => ({ ...prev, to: e.target.value }))}
                          placeholder="recipient@domain.com"
                          className="w-full bg-obsidian-900 border border-obsidian-800 rounded-lg p-2 text-white text-xs outline-none focus:border-rose-500/40"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Subject</label>
                        <input
                          type="text"
                          required
                          value={composeEmail.subject}
                          onChange={(e) => setComposeEmail(prev => ({ ...prev, subject: e.target.value }))}
                          placeholder="Topic..."
                          className="w-full bg-obsidian-900 border border-obsidian-800 rounded-lg p-2 text-white text-xs outline-none focus:border-rose-500/40"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Message Body</label>
                        <textarea
                          rows={4}
                          required
                          value={composeEmail.body}
                          onChange={(e) => setComposeEmail(prev => ({ ...prev, body: e.target.value }))}
                          placeholder="Write email contents here..."
                          className="w-full bg-obsidian-900 border border-obsidian-800 rounded-lg p-2 text-white text-xs outline-none focus:border-rose-500/40 resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 px-4 rounded-lg bg-rose-500 text-white font-display font-bold text-xs hover:bg-rose-600 transition flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send Live Gmail
                      </button>
                    </form>
                  </div>

                  {/* Mail Inbox Feed */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-obsidian-850">
                      <span className="text-xs font-bold text-gray-400 font-display">GMAIL INCOMING MATRICES</span>
                      <button 
                        onClick={fetchEmails} 
                        className="text-[10px] text-rose-400 hover:underline font-semibold flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Refresh Inbox
                      </button>
                    </div>

                    {emails.length === 0 ? (
                      <div className="text-center py-16 bg-obsidian-950/40 rounded-2xl border border-obsidian-800">
                        <Mail className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">Inbox empty or permissions not granted.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto">
                        {emails.map((email) => (
                          <div 
                            key={email.id}
                            className="p-3 bg-obsidian-950 hover:bg-obsidian-900 border border-obsidian-800 rounded-xl text-left relative transition group"
                          >
                            <div className="flex justify-between items-start gap-1">
                              <span className="text-[10px] font-mono text-rose-400 font-semibold truncate max-w-[65%]">
                                {email.from}
                              </span>
                              <span className="text-[9px] text-gray-500 font-mono shrink-0">
                                {new Date(email.date).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <h4 className="text-xs font-bold text-white font-display mt-1 truncate group-hover:text-rose-300 duration-150">
                              {email.subject}
                            </h4>
                            <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 leading-relaxed font-sans">
                              {email.snippet}
                            </p>

                            <button
                              onClick={() => setSelectedEmail(email)}
                              className="absolute bottom-3 right-3 text-[10px] font-bold text-rose-500 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center gap-1 hover:underline"
                            >
                              <Eye className="w-3 h-3" /> View
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* SUB-VIEW D: GOOGLE DRIVE FILE SYSTEM */}
              {wsTab === 'drive' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  key="drive_tab"
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left"
                >
                  {/* Left column: Create New File */}
                  <div className="lg:col-span-5 bg-obsidian-950/80 border border-obsidian-800 p-5 rounded-2xl h-fit">
                    <div className="flex items-center gap-2 pb-3 border-b border-obsidian-850 mb-4">
                      <Plus className="w-4 h-4 text-rose-500" />
                      <h4 className="text-xs font-bold text-white uppercase font-display">Create Text Document</h4>
                    </div>

                    <form onSubmit={createDriveFile} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">File Name (Auto-.txt appended)</label>
                        <input
                          type="text"
                          required
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          placeholder="e.g. ChatStreamNotes"
                          className="w-full bg-obsidian-900 border border-obsidian-800 rounded-lg p-2.5 text-white text-xs outline-none focus:border-rose-500/40"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">File Content (Optional Plain Text)</label>
                        <textarea
                          rows={6}
                          value={newFileContent}
                          onChange={(e) => setNewFileContent(e.target.value)}
                          placeholder="Write plain text characters to store inside the file..."
                          className="w-full bg-obsidian-900 border border-obsidian-800 rounded-lg p-2.5 text-white text-xs outline-none focus:border-rose-500/40 resize-none font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 font-display font-bold text-xs text-white hover:opacity-90 transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/20"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Save File to Drive & Sync Log
                      </button>
                    </form>
                  </div>

                  {/* Right column: Files list */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-obsidian-850 gap-2">
                      <span className="text-xs font-bold text-gray-400 font-display">GOOGLE DRIVE ENTITIES</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Filter files..."
                          value={driveSearch}
                          onChange={(e) => setDriveSearch(e.target.value)}
                          className="bg-obsidian-950 border border-obsidian-850 px-2.5 py-1 text-[10px] rounded-lg text-white max-w-[120px] outline-none focus:border-rose-500/40"
                        />
                        <button 
                          onClick={fetchDriveFiles} 
                          className="text-[10px] text-rose-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Sync Files
                        </button>
                      </div>
                    </div>

                    {driveFiles.length === 0 ? (
                      <div className="text-center py-20 bg-obsidian-950/40 rounded-2xl border border-obsidian-800">
                        <HardDrive className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                        <p className="text-xs text-gray-500">No documents or files found in Google Drive.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar">
                        {driveFiles
                          .filter(f => f.name.toLowerCase().includes(driveSearch.toLowerCase()))
                          .map((file) => {
                            const isFolder = file.mimeType === "application/vnd.google-apps.folder";
                            return (
                              <div
                                key={file.id}
                                className="p-3 bg-obsidian-950 hover:bg-obsidian-900/60 border border-obsidian-800/80 rounded-xl flex items-center justify-between transition gap-4 group"
                              >
                                <div className="flex items-center gap-3 truncate">
                                  {isFolder ? (
                                    <Folder className="w-5 h-5 text-indigo-400 shrink-0" />
                                  ) : (
                                    <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                                  )}
                                  <div className="truncate text-left">
                                    <h5 className="text-xs font-bold text-white truncate font-display group-hover:text-rose-300 transition-colors">
                                      {file.name}
                                    </h5>
                                    <p className="text-[9px] text-gray-500 font-mono mt-0.5 max-w-[250px] truncate">
                                      {file.mimeType.replace("application/vnd.google-apps.", "gsuite/")}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {file.webViewLink && (
                                    <a
                                      href={file.webViewLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 px-2 text-[10px] bg-indigo-950/40 text-indigo-400 hover:bg-indigo-950 hover:text-white rounded-lg border border-indigo-900/40 flex items-center gap-1 font-semibold"
                                    >
                                      <span>Open</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => deleteDriveFile(file.id, file.name)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                                    title="Delete File"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* SUB-VIEW E: GOOGLE SLIDES INTEGRATIONS */}
              {wsTab === 'slides' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  key="slides_tab"
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left"
                >
                  {/* Left Column: Build and lists */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Creator Form */}
                    <div className="bg-obsidian-950/80 border border-obsidian-800 p-4 rounded-2xl">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-obsidian-850 mb-3">
                        <Plus className="w-3.5 h-3.5 text-rose-500" />
                        <h4 className="text-xs font-bold text-white uppercase font-display">Create Presentation Deck</h4>
                      </div>

                      <form onSubmit={createPresentation} className="space-y-3">
                        <div>
                          <input
                            type="text"
                            required
                            value={newPresTitle}
                            onChange={(e) => setNewPresTitle(e.target.value)}
                            placeholder="e.g. Q3 Elite Performance Deck"
                            className="w-full bg-obsidian-900 border border-obsidian-800 rounded-lg p-2 text-white text-xs outline-none focus:border-rose-500/40"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 px-4 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-display font-medium text-xs transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Presentation className="w-3.5 h-3.5" />
                          Construct Empty Deck
                        </button>
                      </form>
                    </div>

                    {/* Left Lists */}
                    <div className="bg-obsidian-950/80 border border-obsidian-800 p-4 rounded-2xl">
                      <div className="flex items-center justify-between pb-3 border-b border-obsidian-850 mb-2">
                        <span className="text-[10px] font-bold text-gray-400 font-display">PRESENTATIONS</span>
                        <button 
                          onClick={fetchPresentations} 
                          className="text-[9px] text-rose-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="w-2.5 h-2.5 animate-spin-hover" /> Reload
                        </button>
                      </div>

                      {presentations.length === 0 ? (
                        <p className="text-[11px] text-gray-500 py-6 text-center">No slide presentations detected.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {presentations.map((pres) => {
                            const isSelected = currentPresentation?.presentationId === pres.id;
                            return (
                              <button
                                key={pres.id}
                                onClick={() => fetchPresentationDetails(pres.id)}
                                className={`w-full p-2.5 rounded-xl text-left text-xs transition duration-150 flex items-center justify-between border ${
                                  isSelected 
                                    ? "bg-rose-500/10 border-rose-500/40 text-rose-400" 
                                    : "bg-obsidian-900/60 border-obsidian-800/60 text-gray-400 hover:bg-obsidian-900 hover:text-white"
                                }`}
                              >
                                <span className="font-semibold font-display truncate pr-2">{pres.name}</span>
                                <ArrowRight className="w-3 h-3 opacity-50 shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Slide structures preview workspace */}
                  <div className="lg:col-span-7 bg-obsidian-950 border border-obsidian-800 rounded-2xl p-5 flex flex-col h-[400px]">
                    {currentPresentation ? (
                      <div className="flex flex-col h-full justify-between">
                        <div className="pb-3 border-b border-obsidian-850 text-left">
                          <span className="text-[9px] font-mono text-rose-500 uppercase font-bold tracking-wider">ACTIVE SLIDE DECK</span>
                          <h4 className="text-sm font-bold text-white font-display mt-0.5 truncate pr-2">
                            🖥️ {currentPresentation.title}
                          </h4>
                          <p className="text-[9px] text-gray-500 font-mono mt-0.5 truncate">{currentPresentation.presentationId}</p>
                        </div>

                        {/* Contents list */}
                        <div className="flex-grow my-4 overflow-y-auto pr-1 space-y-3 text-left scrollbar">
                          <div className="bg-obsidian-900/80 p-3.5 rounded-xl border border-obsidian-850">
                            <h5 className="text-xs font-bold text-gray-300 font-display">Structure Summary</h5>
                            <ul className="mt-2 space-y-1.5 text-[11px] text-gray-400 font-mono">
                              <li>● Revision ID: <span className="text-white">{currentPresentation.revisionId || "N/A"}</span></li>
                              <li>● Slide Count: <span className="text-emerald-400 font-bold">{currentPresentation.slides?.length || 1} pages</span></li>
                              <li>● Locale settings: <span className="text-white">en-US</span></li>
                            </ul>
                          </div>

                          <div className="space-y-2">
                            <h5 className="text-xs font-bold text-gray-400 font-display">Slide Layout Hierarchy</h5>
                            {(currentPresentation.slides || []).map((slide: any, sIdx: number) => (
                              <div 
                                key={slide.objectId}
                                className="p-3 bg-obsidian-900 border border-obsidian-850 hover:border-obsidian-800 rounded-xl"
                              >
                                <div className="flex justify-between items-center text-[10px] font-mono">
                                  <span className="text-rose-400 font-bold">Slide {sIdx + 1}</span>
                                  <span className="text-gray-500">ID: {slide.objectId}</span>
                                </div>
                                <p className="text-[11px] text-gray-300 mt-1 font-sans">
                                  Layout: <span className="text-indigo-400 font-semibold">{slide.slideProperties?.layoutType || "TITLE_AND_BODY"}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-obsidian-850 flex justify-end gap-2 shrink-0">
                          <a
                            href={`https://docs.google.com/presentation/d/${currentPresentation.presentationId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-display text-xs p-2.5 px-4 rounded-xl flex items-center gap-1.5 font-bold transition duration-150"
                          >
                            <span>Open in Slides Workspace</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 py-20 text-xs text-gray-500">
                        <Presentation className="w-8 h-8 text-gray-700 mb-2" />
                        <h4 className="font-bold text-gray-400">No Presentation Deck Loaded</h4>
                        <p className="mt-1 max-w-[280px]">Select a presentation from libraries on the left to analyze its Page ID structural components.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          )}
        </div>
      )}

      {/* CONFIRMATION MUTATION POPUP (Safety Requirement) */}
      <AnimatePresence>
        {confirmData && confirmData.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-obsidian-900 border border-obsidian-750 max-w-md w-full p-6 h-auto rounded-2xl relative text-left"
            >
              <h3 className="font-display font-black text-white text-base border-b border-obsidian-800 pb-3 flex items-center gap-2">
                🔒 Verified Authorization Gate
              </h3>
              
              <div className="my-4 space-y-2 text-xs">
                <p className="text-gray-300 font-medium leading-relaxed">
                  {confirmData.description}
                </p>
                <div className="bg-obsidian-950 p-3 rounded-lg border border-obsidian-850">
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">WORKSPACE DISPATCH TYPE</p>
                  <p className="text-xs font-bold text-rose-500 font-mono capitalize mt-0.5">
                    {confirmData.actionType === 'send_email' ? "Core Gmail Transmitter" : "Workspace Chat Channel"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setConfirmData(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-obsidian-800 text-gray-400 hover:bg-obsidian-750 border border-obsidian-700/50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition shadow-lg shadow-rose-950/50 flex items-center gap-1"
                >
                  Confirm & Dispatch
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAIL EMAIL VIEW MODAL */}
      <AnimatePresence>
        {selectedEmail && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-obsidian-900 border border-obsidian-750 max-w-2xl w-full p-6 h-auto rounded-3xl relative text-left"
            >
              <button
                onClick={() => setSelectedEmail(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white font-mono text-base font-bold"
              >
                ✕
              </button>

              <div className="pb-3 border-b border-obsidian-800">
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest block font-bold">GMAIL VIEWER</span>
                <h3 className="font-display font-bold text-white text-base mt-1">
                  {selectedEmail.subject}
                </h3>
                <div className="flex justify-between items-center text-[10px] text-gray-500 mt-2 font-mono">
                  <span>From: {selectedEmail.from}</span>
                  <span>{new Date(selectedEmail.date).toLocaleString()}</span>
                </div>
              </div>

              <div className="my-5 p-4 rounded-xl bg-obsidian-950 border border-obsidian-850 max-h-[300px] overflow-y-auto">
                <p className="text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-line">
                  {selectedEmail.snippet}
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-obsidian-800 text-gray-300 hover:bg-obsidian-750 transition border border-obsidian-700/50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
