import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-knowledge-base',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-knowledge-base.html',
  styleUrl: './admin-knowledge-base.scss'
})
export class AdminKnowledgeBase implements OnInit {
  communities: any[] = [];
  filteredCommunities: any[] = [];
  selectedCommunity: any = null;
  searchQuery = '';
  isLoading = false;

  documents: any[] = [];
  documentsLoading = false;

  showUploadModal = false;
  uploading = false;
  uploadProgress = 0;
  processingDocId: string | null = null;
  downloadingDocId: string | null = null;
  uploadFile: File | null = null;
  uploadForm = { title: '', document_type: 'general' };

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadCommunities();
  }

  loadCommunities() {
    this.isLoading = true;
    this.http.get<any[]>('/api/v1/admin/schemes').subscribe({
      next: (data) => {
        this.communities = data;
        this.filteredCommunities = data;
        this.isLoading = false;
        if (data.length > 0) {
          this.selectCommunity(data[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load communities', err);
        this.isLoading = false;
      }
    });
  }

  filterCommunities() {
    const q = this.searchQuery.toLowerCase();
    this.filteredCommunities = this.communities.filter(c => 
      c.scheme_name.toLowerCase().includes(q) || c.scheme_code.toLowerCase().includes(q)
    );
  }

  selectCommunity(community: any) {
    this.selectedCommunity = community;
    this.fetchDocuments(community.id);
  }

  fetchDocuments(schemeId: string) {
    this.documentsLoading = true;
    this.cdr.detectChanges();
    this.http.get<any[]>(`/api/v1/admin/schemes/${schemeId}/knowledge`).subscribe({
      next: (data) => {
        this.documents = data;
        this.documentsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch documents', err);
        this.documentsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  triggerUpload() {
    if (!this.selectedCommunity) return;
    this.uploadFile = null;
    this.uploadForm = { title: '', document_type: 'general' };
    this.showUploadModal = true;
  }

  closeUploadModal() {
    this.showUploadModal = false;
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.uploadFile = file;
      this.uploadForm.title = file.name;
    }
  }

  submitUpload() {
    if (!this.selectedCommunity || !this.uploadFile) return;
    this.uploading = true;
    this.uploadProgress = 0;
    this.cdr.detectChanges();

    const fd = new FormData();
    fd.append('file', this.uploadFile);
    fd.append('title', this.uploadForm.title);
    fd.append('document_type', this.uploadForm.document_type);

    this.http.post(`/api/v1/admin/schemes/${this.selectedCommunity.id}/knowledge/upload`, fd, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          if (event.total) {
            this.uploadProgress = Math.round(100 * event.loaded / event.total);
            this.cdr.detectChanges();
          }
        } else if (event.type === HttpEventType.Response) {
          this.uploading = false;
          this.uploadProgress = 0;
          this.closeUploadModal();
          this.fetchDocuments(this.selectedCommunity.id);
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.uploading = false;
        this.uploadProgress = 0;
        alert('Upload failed: ' + (err.error?.error || err.message));
        this.cdr.detectChanges();
      }
    });
  }

  processDocument(docId: string) {
    if (!this.selectedCommunity) return;
    this.processingDocId = docId;
    this.cdr.detectChanges();
    
    this.http.post(`/api/v1/admin/schemes/${this.selectedCommunity.id}/knowledge/${docId}/process`, {}).subscribe({
      next: () => {
        this.processingDocId = null;
        this.fetchDocuments(this.selectedCommunity.id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Processing failed', err);
        this.processingDocId = null;
        alert('AI Processing failed: ' + (err.error?.error || err.message));
        this.cdr.detectChanges();
      }
    });
  }

  downloadDocument(doc: any) {
    if (!this.selectedCommunity) return;
    this.downloadingDocId = doc.id;
    this.http.get(`/api/v1/admin/schemes/${this.selectedCommunity.id}/knowledge/${doc.id}/download`, {
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        this.downloadingDocId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.original_filename;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Download failed', err);
        this.downloadingDocId = null;
        if (err.error instanceof Blob) {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const result = JSON.parse(e.target?.result as string);
              alert('Download failed: ' + (result.error || 'Unknown error'));
            } catch {
              alert('Download failed: Could not retrieve document from storage.');
            }
          };
          reader.readAsText(err.error);
        } else {
          alert('Download failed: ' + (err.error?.error || err.message));
        }
      }
    });
  }

  deleteDocument(docId: string) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    this.http.delete(`/api/v1/admin/schemes/${this.selectedCommunity.id}/knowledge/${docId}`).subscribe({
      next: () => {
        this.fetchDocuments(this.selectedCommunity.id);
      },
      error: (err) => {
        console.error('Delete failed', err);
        alert('Delete failed');
        this.cdr.detectChanges();
      }
    });
  }
}
