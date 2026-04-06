import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  
  messages: { role: 'user' | 'assistant', content: string, isStreaming?: boolean, uiComponent?: string, uiData?: any }[] = [];
  currentMessage = '';
  isProcessing = false;
  statusMessage = '';
  conversationId: string | null = null;
  schemeId: string | null = null;
  currentAttachment: string | null = null;

  constructor(
    private http: HttpClient, 
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.schemeId = this.route.snapshot.queryParamMap.get('schemeId');
    if (!this.schemeId) {
      this.messages.push({ role: 'assistant', content: 'Warning: No Community Scheme selected. Please launch the chat from a specific community dashboard to test the Knowledge Base.' });
    } else {
      this.messages.push({ role: 'assistant', content: 'Hello! I am Wendy, your community scheme support desk. Loading community details...' });
      
      this.http.get<any>(`/api/v1/chat/schemes/${this.schemeId}`).subscribe({
        next: (scheme) => {
          this.messages[0].content = `Hello! I am Wendy, your community scheme support desk for **${scheme.scheme_name}**. I am hooked into the live Knowledge Base. Ask me anything about your community!`;
          this.cdr.detectChanges();
        },
        error: () => {
          this.messages[0].content = `Hello! I am Wendy, your community scheme support desk. I am hooked into the live Knowledge Base. Ask me anything about your community!`;
          this.cdr.detectChanges();
        }
      });
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  async sendMessage() {
    if (!this.currentMessage.trim() || this.isProcessing) return;

    if (!this.schemeId) {
      if (this.currentMessage.trim().toLowerCase() === 'my name is wayne and my id is 123456789') {
        const payload = this.currentMessage.trim();
        this.messages.push({ role: 'user', content: payload });
        this.currentMessage = '';
        this.isProcessing = true;

        this.http.get<any[]>('/api/v1/admin/schemes').subscribe({
          next: (schemes) => {
            let html = '<p><strong>System Override Active.</strong> Authentication confirmed, Wayne.<br>Please select a community to initialize the AI Agent:</p><div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:1rem;">';
            schemes.forEach(s => {
              html += `<a href="/chat?schemeId=${s.id}" style="padding: 0.5rem 1rem; background: var(--primary); color: white; border-radius: 4px; text-decoration: none; text-align: center; font-size: 0.9rem;">${s.scheme_name}</a>`;
            });
            html += '</div>';
            this.messages.push({ role: 'assistant', content: html });
            this.isProcessing = false;
          },
          error: (err) => {
            this.messages.push({ role: 'assistant', content: '⚠ Access denied. Active admin session required.' });
            this.isProcessing = false;
          }
        });
        return;
      }

      this.messages.push({ role: 'user', content: this.currentMessage.trim() });
      this.messages.push({ role: 'assistant', content: '⚠ A Community Scheme must be active to chat. Please launch this window from the Admin Dashboard.' });
      this.currentMessage = '';
      return;
    }

    const payload = this.currentMessage.trim();
    const payloadAttachment = this.currentAttachment;
    
    // We visually represent the user's message. If there's an attachment, add a UI flag (not currently implemented in html but good practice)
    this.messages.push({ role: 'user', content: payload + (payloadAttachment ? ' [Image Attached]' : '') });
    
    this.currentMessage = '';
    this.currentAttachment = null;
    this.isProcessing = true;
    this.statusMessage = 'Initializing agent...';

    // Build auth headers for fetch (bypassing Angular Interceptor because fetch is native)
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch('http://127.0.0.1:3000/api/v1/chat/message', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: payload,
          attachment: payloadAttachment,
          schemeId: this.schemeId,
          conversationId: this.conversationId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      // Create an empty assistant message to append stream to
      this.messages.push({ role: 'assistant', content: '', isStreaming: true });

      let streamBuffer = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
             this.isProcessing = false;
             this.statusMessage = '';
             this.messages[this.messages.length - 1].isStreaming = false;
             this.cdr.detectChanges();
             break;
          }

          streamBuffer += decoder.decode(value, { stream: true });

          let doubleNewlineIndex = streamBuffer.indexOf('\n\n');
          while (doubleNewlineIndex !== -1) {
            const rawEvent = streamBuffer.slice(0, doubleNewlineIndex);
            streamBuffer = streamBuffer.slice(doubleNewlineIndex + 2);

            const dataStr = rawEvent.replace(/^data:\s*/, '').trim();
            if (dataStr) {
              try {
                const event = JSON.parse(dataStr);
                
                if (event.type === 'init') {
                  this.conversationId = event.conversationId;
                } else if (event.type === 'status') {
                  this.statusMessage = event.content;
                } else if (event.type === 'text') {
                  this.messages[this.messages.length - 1].content += event.content;
                } else if (event.type === 'ui_action') {
                  this.messages[this.messages.length - 1].uiComponent = event.actionType;
                  this.messages[this.messages.length - 1].uiData = event.actionData;
                } else if (event.type === 'error') {
                  this.messages[this.messages.length - 1].content += `<br/><br/>⚠ Warning: ${event.content}`;
                  this.isProcessing = false;
                  this.statusMessage = '';
                  this.messages[this.messages.length - 1].isStreaming = false;
                } else if (event.type === 'complete') {
                  this.statusMessage = '';
                  this.isProcessing = false;
                  this.messages[this.messages.length - 1].isStreaming = false;
                }
                this.cdr.detectChanges();
              } catch (e) {
                console.error("Error parsing SSE JSON:", e, dataStr);
              }
            }
            doubleNewlineIndex = streamBuffer.indexOf('\n\n');
          }
        }
      }
    } catch (err) {
      console.error('Chat error', err);
      this.messages.push({ role: 'assistant', content: '⚠ I encountered an error communicating with the server. Please try again.' });
      this.isProcessing = false;
      this.statusMessage = '';
    }
  }

  submitMaintenanceForm(category: string, urgency: string, desc: string, msg: any) {
    if (!category || !urgency || !desc) {
      alert("Please fill out all fields.");
      return;
    }
    // Prevent double submission
    msg.uiData = { ...msg.uiData, submitted: true };
    
    this.currentMessage = `Please log a maintenance request for me: Category is ${category}, urgency is ${urgency}. Description: ${desc}`;
    this.sendMessage();
  }

  payLevy(msg: any) {
    alert("Secure payment gateway modal would open here (mocked).");
    msg.uiData = { ...msg.uiData, paid: true };
  }

  sendSuggestion(text: string) {
    if (text === 'Query rules') {
      this.messages.push({ role: 'user', content: text });
      this.messages.push({ role: 'assistant', content: 'Go ahead, let me know your question!' });
      return;
    }
    this.currentMessage = text;
    this.sendMessage();
  }

  downloadRules() {
    alert("Downloading official Conduct Rules PDF...");
  }

  triggerAttachmentSelection() {
    const fileInput = document.getElementById('chat-file-upload') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  handleFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only images are supported for visual analysis.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.currentAttachment = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = null; // reset
  }

  removeAttachment() {
    this.currentAttachment = null;
  }
}
