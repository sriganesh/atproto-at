/**
 * Search indexing utilities for progressive content search
 */

import { SearchableRecord, ContentLoadStatus } from '../types';

export class SearchIndexer {
  private index: Map<string, Set<string>> = new Map(); // term -> record URIs
  private recordContent: Map<string, string> = new Map(); // URI -> searchable text
  private basicRecordContent: Map<string, string> = new Map(); // URI -> basic searchable text
  private indexedRecords = new Set<string>(); // Track which records have full content indexed

  /**
   * Add or update a record in the search index
   */
  addRecord(record: SearchableRecord): void {
    if (record.contentLoadStatus !== ContentLoadStatus.Loaded || !record.loadedContent) {
      return;
    }

    // Extract searchable text based on content type
    const searchableText = this.extractSearchableText(record);
    if (!searchableText) return;

    // Remove old index entries if updating
    this.removeRecord(record.uri);

    // Store the searchable content
    this.recordContent.set(record.uri, searchableText.toLowerCase());
    this.indexedRecords.add(record.uri);

    // Index individual terms
    const terms = this.tokenize(searchableText);
    terms.forEach(term => {
      if (!this.index.has(term)) {
        this.index.set(term, new Set());
      }
      this.index.get(term)!.add(record.uri);
    });
  }

  /**
   * Remove a record from the index
   */
  removeRecord(recordUri: string): void {
    const content = this.recordContent.get(recordUri);
    if (!content) return;

    // Remove from term index
    const terms = this.tokenize(content);
    terms.forEach(term => {
      const uris = this.index.get(term);
      if (uris) {
        uris.delete(recordUri);
        if (uris.size === 0) {
          this.index.delete(term);
        }
      }
    });

    // Remove content
    this.recordContent.delete(recordUri);
    this.indexedRecords.delete(recordUri);
  }

  /**
   * Add basic record metadata for immediate search
   */
  addBasicRecord(record: any): void {
    // Extract basic searchable text from record metadata
    const parts: string[] = [];
    
    // Add URI components (handle/DID)
    if (record.uri) {
      parts.push(record.uri);
      const uriParts = record.uri.split('/');
      parts.push(...uriParts);
    }
    
    // Add record type
    if (record.value?.$type) {
      parts.push(record.value.$type);
    }
    
    // Add any text content
    if (record.value?.text) {
      parts.push(record.value.text);
    }
    
    // Add subject URI for likes/reposts (contains post author DID)
    if (record.value?.subject?.uri) {
      parts.push(record.value.subject.uri);
      const subjectParts = record.value.subject.uri.split('/');
      parts.push(...subjectParts);
    }
    
    // Add post URI for threadgates/postgates
    if ((record.value.$type === 'app.bsky.feed.threadgate' || 
         record.value.$type === 'app.bsky.feed.postgate') && 
        record.value.post) {
      parts.push(record.value.post);
      const postParts = record.value.post.split('/');
      parts.push(...postParts);
    }
    
    // Add creation date
    if (record.value?.createdAt) {
      parts.push(record.value.createdAt);
    }
    
    // For likes/reposts/threadgates/postgates, we can't search by post content in basic search
    // because that info isn't in the record. It requires loading the full content.
    
    // Store basic content
    const basicText = parts.join(' ').toLowerCase();
    this.basicRecordContent.set(record.uri, basicText);
  }

  /**
   * Search for records matching the query
   */
  search(query: string): Set<string> {
    if (!query.trim()) return new Set();

    const queryLower = query.toLowerCase();
    const results = new Set<string>();

    // Search in full content first
    this.recordContent.forEach((content, uri) => {
      if (content.includes(queryLower)) {
        results.add(uri);
      }
    });

    // Also search in basic metadata
    this.basicRecordContent.forEach((content, uri) => {
      if (content.includes(queryLower) && !results.has(uri)) {
        results.add(uri);
      }
    });

    return results;
  }

  /**
   * Get the number of indexed records
   */
  getIndexedCount(): number {
    return this.recordContent.size;
  }

  /**
   * Clear the entire index
   */
  clear(): void {
    this.index.clear();
    this.recordContent.clear();
  }

  /**
   * Extract searchable text from a record based on its type
   */
  private extractSearchableText(record: SearchableRecord): string {
    const content = record.loadedContent;
    if (!content) return '';

    const parts: string[] = [];

    // Extract text based on record type
    if (record.value.$type === 'app.bsky.feed.like' && content.post) {
      // For likes, index the liked post content
      if (content.post.text) parts.push(content.post.text);
      if (content.post.author?.handle) parts.push(content.post.author.handle);
      if (content.post.author?.displayName) parts.push(content.post.author.displayName);
    } else if (record.value.$type === 'app.bsky.feed.repost' && content.post) {
      // For reposts, index the reposted content
      if (content.post.text) parts.push(content.post.text);
      if (content.post.author?.handle) parts.push(content.post.author.handle);
      if (content.post.author?.displayName) parts.push(content.post.author.displayName);
    } else if (record.value.$type === 'app.bsky.feed.post' && content.post) {
      // For posts, index the post content INCLUDING author info
      if (content.post.text) parts.push(content.post.text);
      if (content.post.author?.handle) parts.push(content.post.author.handle);
      if (content.post.author?.displayName) parts.push(content.post.author.displayName);
    } else if (record.value.$type === 'app.bsky.actor.profile' && content.profile) {
      // For profiles
      if (content.profile.handle) parts.push(content.profile.handle);
      if (content.profile.displayName) parts.push(content.profile.displayName);
      if (content.profile.description) parts.push(content.profile.description);
    } else if (record.value.$type === 'app.bsky.graph.list' && content.list) {
      // For lists
      if (content.list.name) parts.push(content.list.name);
      if (content.list.description) parts.push(content.list.description);
    } else if (record.value.$type === 'app.bsky.feed.threadgate' && content.post) {
      // For threadgates - index the associated post content
      if (content.post.text) parts.push(content.post.text);
      if (content.post.author?.handle) parts.push(content.post.author.handle);
      if (content.post.author?.displayName) parts.push(content.post.author.displayName);
      // Also index the rules
      if (record.value.allow) {
        parts.push(JSON.stringify(record.value.allow));
      }
    } else if (record.value.$type === 'app.bsky.feed.postgate' && content.post) {
      // For postgates - index the associated post content
      if (content.post.text) parts.push(content.post.text);
      if (content.post.author?.handle) parts.push(content.post.author.handle);
      if (content.post.author?.displayName) parts.push(content.post.author.displayName);
      // Also index the rules
      if (record.value.detachedEmbeddingUris) {
        parts.push(...record.value.detachedEmbeddingUris);
      }
      if (record.value.embeddingRules) {
        parts.push(JSON.stringify(record.value.embeddingRules));
      }
    }

    // Also include the URI for searching
    parts.push(record.uri);
    
    return parts.filter(Boolean).join(' ');
  }

  /**
   * Simple tokenization for indexing
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(token => token.length > 1) // Skip single characters
      .map(token => token.replace(/[^a-z0-9]/g, '')) // Remove punctuation
      .filter(Boolean);
  }
  
  /**
   * Get count of indexed records
   */
  getIndexedCount(): number {
    return this.indexedRecords.size;
  }
}