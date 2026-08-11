import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

const TAG_POOL: ReadonlyArray<string> = [
  'angular',
  'typescript',
  'javascript',
  'web-development',
  'programming',
  'tutorial',
  'beginners',
  'frontend',
  'rxjs',
  'testing',
  'css',
  'html',
  'nodejs',
  'api',
  'design-patterns',
  'software',
  'development',
  'coding',
  'open-source',
  'best-practices',
];

@Injectable({ providedIn: 'root' })
export class AiTagSuggestionsService {
  suggestTags(title: string, description: string, body: string): Observable<string[]> {
    const seed = this.hash(`${title}|${description}|${body}`);
    const count = 3 + (seed % 4);
    const tags: string[] = [];
    for (let i = 0; i < count; i++) {
      tags.push(TAG_POOL[(seed + i) % TAG_POOL.length]);
    }
    return of(tags).pipe(delay(300));
  }

  private hash(input: string): number {
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
      h = ((h << 5) + h) ^ input.charCodeAt(i);
      h = h & 0x7fffffff;
    }
    return h;
  }
}
