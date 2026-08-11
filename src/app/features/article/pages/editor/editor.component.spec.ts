import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import EditorComponent from './editor.component';
import { ArticlesService } from '../../services/articles.service';
import { UserService } from '../../../../core/auth/services/user.service';
import { AiTagSuggestionsService } from '../../services/ai-tag-suggestions.service';

describe('EditorComponent', () => {
  let fixture: ComponentFixture<EditorComponent>;
  let component: EditorComponent;
  let mockAiTagService: { suggestTags: ReturnType<typeof vi.fn> };

  const mockArticlesService = { get: vi.fn(), create: vi.fn(), update: vi.fn() };
  const mockRouter = { navigate: vi.fn() };
  const mockUserService = { getCurrentUser: vi.fn() };
  const mockRoute = { snapshot: { params: {} } };

  beforeEach(async () => {
    mockAiTagService = { suggestTags: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [EditorComponent, ReactiveFormsModule],
      providers: [
        { provide: ArticlesService, useValue: mockArticlesService },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: UserService, useValue: mockUserService },
        { provide: AiTagSuggestionsService, useValue: mockAiTagService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // AK-6: signals declared
  it('declares suggestedTags and isSuggestingTags signals', () => {
    expect(component.suggestedTags()).toEqual([]);
    expect(component.isSuggestingTags()).toBe(false);
  });

  // AK-14.1: correct args passed to service
  it('calls the service with title, description, body from the form', () => {
    mockAiTagService.suggestTags.mockReturnValue(of(['angular', 'typescript', 'rxjs']));
    component.articleForm.patchValue({ title: 'My Title', description: 'My Desc', body: 'My Body' });
    component.suggestTags();
    expect(mockAiTagService.suggestTags).toHaveBeenCalledWith('My Title', 'My Desc', 'My Body');
  });

  // AK-14.2 + AK-11: Suggest Tags button disabled when title or body is empty (AK-RENDER)
  it('Suggest Tags button is disabled when title or body is empty', () => {
    // Both empty → disabled
    fixture.detectChanges();
    expect(getSuggestButton(fixture.nativeElement as HTMLElement)?.disabled).toBe(true);

    // Only title filled → still disabled (simulate user input to trigger Angular's form directive)
    setInputValue(fixture.nativeElement as HTMLElement, 'input[name="title"]', 'Some Title');
    fixture.detectChanges();
    expect(getSuggestButton(fixture.nativeElement as HTMLElement)?.disabled).toBe(true);

    // Both title and body filled → enabled
    setInputValue(fixture.nativeElement as HTMLElement, 'textarea[name="body"]', 'Some body');
    fixture.detectChanges();
    expect(getSuggestButton(fixture.nativeElement as HTMLElement)?.disabled).toBe(false);
  });

  // AK-14.3: isSuggestingTags is true until the observable completes
  it('sets isSuggestingTags to true while waiting for service and false after', () => {
    const subject = new Subject<string[]>();
    mockAiTagService.suggestTags.mockReturnValue(subject.asObservable());

    component.articleForm.patchValue({ title: 'T', body: 'B' });
    component.suggestTags();

    expect(component.isSuggestingTags()).toBe(true);

    subject.next(['angular', 'typescript', 'rxjs']);
    subject.complete();

    expect(component.isSuggestingTags()).toBe(false);
  });

  // AK-11: button label changes to 'Suggesting...' during loading (AK-RENDER)
  it('button label changes to Suggesting... while loading', () => {
    const subject = new Subject<string[]>();
    mockAiTagService.suggestTags.mockReturnValue(subject.asObservable());

    component.articleForm.patchValue({ title: 'T', body: 'B' });
    component.suggestTags();
    fixture.detectChanges();

    const btn = getSuggestButton(fixture.nativeElement as HTMLElement);
    expect(btn!.textContent?.trim()).toBe('Suggesting...');

    subject.next(['angular']);
    subject.complete();
    fixture.detectChanges();

    expect(btn!.textContent?.trim()).toBe('Suggest Tags');
  });

  // AK-14.4 + AK-RENDER: suggestions rendered as buttons after service response
  it('renders suggested tags as buttons after service responds', () => {
    mockAiTagService.suggestTags.mockReturnValue(of(['angular', 'typescript', 'rxjs']));
    component.articleForm.patchValue({ title: 'T', body: 'B' });
    component.suggestTags();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const pills = el.querySelectorAll<HTMLButtonElement>('button.tag-default.tag-pill');
    expect(pills.length).toBe(3);
    const texts = Array.from(pills).map(b => b.textContent?.trim());
    expect(texts).toContain('angular');
    expect(texts).toContain('typescript');
    expect(texts).toContain('rxjs');
  });

  // AK-14.5 + AK-7: existing tagList tags excluded from rendered suggestions
  it('filters out tags already in tagList from suggestedTags', () => {
    component.tagList.set(['angular']);
    mockAiTagService.suggestTags.mockReturnValue(of(['angular', 'typescript', 'rxjs']));
    component.articleForm.patchValue({ title: 'T', body: 'B' });
    component.suggestTags();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const pills = el.querySelectorAll<HTMLButtonElement>('button.tag-default.tag-pill');
    const texts = Array.from(pills).map(b => b.textContent?.trim());
    expect(texts).not.toContain('angular');
    expect(texts).toContain('typescript');
    expect(texts).toContain('rxjs');
  });

  // AK-14.6 + AK-9: clicking suggestion adds to tagList
  it('addTagFromSuggestion adds the tag to tagList', () => {
    component.suggestedTags.set(['angular', 'typescript']);
    component.addTagFromSuggestion('angular');
    expect(component.tagList()).toContain('angular');
  });

  // AK-14.7 + AK-9: clicking suggestion removes from suggestedTags
  it('addTagFromSuggestion removes the tag from suggestedTags', () => {
    component.suggestedTags.set(['angular', 'typescript']);
    component.addTagFromSuggestion('angular');
    expect(component.suggestedTags()).not.toContain('angular');
    expect(component.suggestedTags()).toContain('typescript');
  });

  // AK-14.8 + AK-9: same tag cannot be added twice
  it('addTagFromSuggestion does not add a duplicate tag to tagList', () => {
    component.tagList.set(['angular']);
    component.suggestedTags.set(['angular', 'typescript']);
    component.addTagFromSuggestion('angular');
    expect(component.tagList().filter(t => t === 'angular').length).toBe(1);
  });

  // AK-12: clicking a rendered suggestion button triggers addTagFromSuggestion
  it('clicking a suggestion button in the template adds it to tagList', () => {
    mockAiTagService.suggestTags.mockReturnValue(of(['angular', 'typescript']));
    component.articleForm.patchValue({ title: 'T', body: 'B' });
    component.suggestTags();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const pills = el.querySelectorAll<HTMLButtonElement>('button.tag-default.tag-pill');
    (pills[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.tagList().length).toBeGreaterThan(0);
  });

  // AK-14.9 + AK-8: loading resets to false on service error
  it('resets isSuggestingTags to false when service errors', () => {
    const subject = new Subject<string[]>();
    mockAiTagService.suggestTags.mockReturnValue(subject.asObservable());

    component.articleForm.patchValue({ title: 'T', body: 'B' });
    component.suggestTags();

    expect(component.isSuggestingTags()).toBe(true);

    subject.error({ errors: { suggestion: 'Service unavailable' } });

    expect(component.isSuggestingTags()).toBe(false);
  });

  // AK-14.10 + AK-8: service error displayed via errors signal
  it('sets errors signal when service errors so ListErrorsComponent can display them', () => {
    const serviceError = { errors: { suggestion: 'Service unavailable' } };
    mockAiTagService.suggestTags.mockReturnValue(throwError(() => serviceError));

    component.articleForm.patchValue({ title: 'T', body: 'B' });
    component.suggestTags();

    expect(component.errors()).toEqual(serviceError);
  });

  // AK-8: clears stale errors before a new suggest request
  it('clears errors before starting a new suggestion request', () => {
    component.errors.set({ errors: { old: 'stale error' } });
    const subject = new Subject<string[]>();
    mockAiTagService.suggestTags.mockReturnValue(subject.asObservable());

    component.articleForm.patchValue({ title: 'T', body: 'B' });
    component.suggestTags();

    expect(component.errors()).toBeNull();
    subject.complete();
  });
});

function setInputValue(nativeElement: HTMLElement, selector: string, value: string): void {
  const el = nativeElement.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (el) {
    el.value = value;
    el.dispatchEvent(new Event('input'));
  }
}

function getSuggestButton(nativeElement: HTMLElement): HTMLButtonElement | null {
  const buttons = Array.from(nativeElement.querySelectorAll<HTMLButtonElement>('button[type="button"]'));
  return (
    buttons.find(b => {
      const text = b.textContent?.trim() ?? '';
      return text === 'Suggest Tags' || text === 'Suggesting...';
    }) ?? null
  );
}
