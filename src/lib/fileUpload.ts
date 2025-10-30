// File upload utilities for OpenAI
export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string; // base64 encoded
  uri?: string; // For OpenAI File API
}

export class FileUploadHandler {
  private maxFileSize = 20 * 1024 * 1024; // 20MB limit
  
  async handleFileUpload(file: File): Promise<UploadedFile> {
    if (file.size > this.maxFileSize) {
      throw new Error(`File too large. Maximum size is ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    const supportedTypes = [
      'text/plain', 'text/markdown', 'text/csv',
      'application/pdf', 'application/json',
      'image/png', 'image/jpeg', 'image/webp', 'image/gif',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!supportedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const content = reader.result as string;
        const base64Content = content.split(',')[1]; // Remove data:mime;base64, prefix
        
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          content: base64Content
        });
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  formatFileForOpenAI(file: UploadedFile) {
    // For OpenAI, we can directly include file content in the request
    if (file.type.startsWith('image/')) {
      return {
        inlineData: {
          mimeType: file.type,
          data: file.content
        }
      };
    } else if (file.type.startsWith('text/') || file.type === 'application/json') {
      // For text files, convert base64 to text and include as text
      const textContent = atob(file.content);
      return {
        text: `[File: ${file.name}]\n\n${textContent}\n\n[End of file]`
      };
    }
    
    return {
      text: `[Attached file: ${file.name} (${file.type}) - ${(file.size / 1024).toFixed(1)}KB]`
    };
  }

  getSupportedTypes(): string[] {
    return [
      '.txt', '.md', '.csv', '.json', '.pdf', '.docx',
      '.png', '.jpg', '.jpeg', '.webp', '.gif'
    ];
  }
}

export const fileUploadHandler = new FileUploadHandler();
