import { TranscriptionSegment } from './transcriptionService';

export interface CaptionRequest {
  photoTimestamp: number;
  audioContext: string;
  inspectionDetails: {
    client: string;
    address: string;
    claimNumber: string;
  };
  photoDescription?: string; // Optional visual description
}

export interface CaptionResult {
  caption: string;
  confidence: number;
  context: string;
  timestamp: number;
}

export class LLMCaptionService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    // Using OpenAI GPT-4 for caption generation
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * Generate caption for a photo based on audio context
   */
  async generateCaption(request: CaptionRequest): Promise<CaptionResult> {
    try {
      console.log('Generating caption for photo at timestamp:', request.photoTimestamp);

      const prompt = this.buildPrompt(request);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert inspection assistant. Generate concise, professional captions for inspection photos based on the audio context and inspection details.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const caption = result.choices[0]?.message?.content?.trim() || 'No caption generated';

      console.log('Caption generated successfully:', caption);

      return {
        caption,
        confidence: 0.9, // High confidence for GPT-4
        context: request.audioContext,
        timestamp: request.photoTimestamp,
      };

    } catch (error) {
      console.error('Failed to generate caption:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Caption generation failed: ${errorMessage}`);
    }
  }

  /**
   * Build prompt for LLM based on inspection context
   */
  private buildPrompt(request: CaptionRequest): string {
    const { photoTimestamp, audioContext, inspectionDetails, photoDescription } = request;
    
    const timestampFormatted = this.formatTimestamp(photoTimestamp);
    
    return `
Inspection Details:
- Client: ${inspectionDetails.client}
- Address: ${inspectionDetails.address}
- Claim Number: ${inspectionDetails.claimNumber}

Photo Context:
- Timestamp: ${timestampFormatted}
- Audio Context: "${audioContext}"
${photoDescription ? `- Visual Description: ${photoDescription}` : ''}

Generate a professional, concise caption (max 100 characters) for this inspection photo. The caption should:
1. Be relevant to the audio context at this timestamp
2. Be professional and inspection-focused
3. Include relevant details about what was being inspected
4. Be clear and descriptive

Caption:`;
  }

  /**
   * Format timestamp to readable format
   */
  private formatTimestamp(timestamp: number): string {
    const totalSeconds = Math.floor(timestamp / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Generate captions for multiple photos in batch
   */
  async generateCaptionsBatch(requests: CaptionRequest[]): Promise<CaptionResult[]> {
    console.log('Generating captions for', requests.length, 'photos');
    
    const results: CaptionResult[] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const batchPromises = batch.map(request => 
        this.generateCaption(request).catch(error => {
          console.error('Failed to generate caption for batch item:', error);
          return {
            caption: 'Caption generation failed',
            confidence: 0,
            context: request.audioContext,
            timestamp: request.photoTimestamp,
          } as CaptionResult;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('Batch caption generation completed:', results.length, 'captions');
    return results;
  }

  /**
   * Test LLM caption service
   */
  async testCaptionGeneration(): Promise<boolean> {
    try {
      console.log('Testing LLM caption service...');
      
      const testRequest: CaptionRequest = {
        photoTimestamp: 30000, // 30 seconds
        audioContext: "Inspecting the roof for damage. I can see some missing shingles and water damage around the chimney area.",
        inspectionDetails: {
          client: "Test Client",
          address: "123 Test Street",
          claimNumber: "TEST-001",
        },
      };
      
      const result = await this.generateCaption(testRequest);
      
      console.log('Test caption generation successful:');
      console.log('Caption:', result.caption);
      console.log('Confidence:', result.confidence);
      
      return true;
    } catch (error) {
      console.error('Test caption generation failed:', error);
      return false;
    }
  }
}

export const llmCaptionService = new LLMCaptionService(); 