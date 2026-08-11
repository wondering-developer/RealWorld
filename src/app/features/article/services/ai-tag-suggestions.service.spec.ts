import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AiTagSuggestionsService } from './ai-tag-suggestions.service';

describe('AiTagSuggestionsService', () => {
  let service: AiTagSuggestionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiTagSuggestionsService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // AK-13a: return type is Observable
  it('suggestTags returns an Observable', () => {
    const result = service.suggestTags('Angular', 'desc', 'body');
    expect(result).toBeDefined();
    expect(typeof result.subscribe).toBe('function');
  });

  // AK-13b: emits 3-6 tags
  it('emits between 3 and 6 tags', async () => {
    let tags: string[] = [];
    service.suggestTags('Angular', 'A guide to Angular', 'Angular is great').subscribe(t => (tags = t));
    await vi.advanceTimersByTimeAsync(500);
    expect(tags.length).toBeGreaterThanOrEqual(3);
    expect(tags.length).toBeLessThanOrEqual(6);
  });

  // AK-13c: all tags are lowercase and well-formed (no malformed entries)
  it('emits only non-empty lowercase hyphenated tags', async () => {
    let tags: string[] = [];
    service.suggestTags('Angular', 'A guide to Angular', 'Angular is great').subscribe(t => (tags = t));
    await vi.advanceTimersByTimeAsync(500);
    expect(tags.length).toBeGreaterThan(0);
    tags.forEach(tag => {
      expect(tag.length).toBeGreaterThan(0);
      expect(tag).toMatch(/^[a-z0-9-]+$/);
    });
  });

  // AK-13d: result is deterministic for same inputs
  it('returns the same tags for the same inputs (deterministic)', async () => {
    let tags1: string[] = [];
    let tags2: string[] = [];
    service.suggestTags('My Title', 'My Description', 'My Body').subscribe(t => (tags1 = t));
    await vi.advanceTimersByTimeAsync(500);
    service.suggestTags('My Title', 'My Description', 'My Body').subscribe(t => (tags2 = t));
    await vi.advanceTimersByTimeAsync(500);
    expect(tags1).toEqual(tags2);
    expect(tags1.length).toBeGreaterThan(0);
  });

  // AK-13d: different inputs yield different results
  it('returns different tags for different inputs', async () => {
    let tags1: string[] = [];
    let tags2: string[] = [];
    service.suggestTags('Title Alpha', 'Desc Alpha', 'Body Alpha').subscribe(t => (tags1 = t));
    await vi.advanceTimersByTimeAsync(500);
    service.suggestTags('Title Beta', 'Desc Beta', 'Body Beta').subscribe(t => (tags2 = t));
    await vi.advanceTimersByTimeAsync(500);
    expect(JSON.stringify(tags1)).not.toBe(JSON.stringify(tags2));
  });

  // AK-13e: no HTTP request is triggered (service works without HttpClientTestingModule)
  it('does not make any HTTP request', async () => {
    let tags: string[] = [];
    // TestBed is configured without HttpClientTestingModule — if an HTTP call were made it would throw
    expect(() => {
      service.suggestTags('test', 'test', 'test').subscribe(t => (tags = t));
    }).not.toThrow();
    await vi.advanceTimersByTimeAsync(500);
    expect(tags.length).toBeGreaterThan(0);
  });

  // AK-4: has an async delay before emitting
  it('does not emit synchronously (includes async delay)', async () => {
    let emitted = false;
    service.suggestTags('Angular', 'desc', 'body').subscribe(() => {
      emitted = true;
    });
    // Before advancing timers, should not have emitted yet
    expect(emitted).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    expect(emitted).toBe(true);
  });
});
