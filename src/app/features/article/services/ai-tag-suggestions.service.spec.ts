import "zone.js";
import "zone.js/testing";
import "@angular/compiler";
import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed, getTestBed } from "@angular/core/testing";
import {
	BrowserDynamicTestingModule,
	platformBrowserDynamicTesting,
} from "@angular/platform-browser-dynamic/testing";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { AiTagSuggestionsService } from "./ai-tag-suggestions.service";

describe("AiTagSuggestionsService", () => {
	beforeAll(() => {
		getTestBed().initTestEnvironment(
			BrowserDynamicTestingModule,
			platformBrowserDynamicTesting(),
		);
	});

	let service: AiTagSuggestionsService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});
		service = TestBed.inject(AiTagSuggestionsService);
		httpMock = TestBed.inject(HttpTestingController);
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		TestBed.resetTestingModule();
	});

	it("should be created", () => {
		expect(service).toBeTruthy();
	});

	// AK-13a: return type is Observable
	it("suggestTags returns an Observable", () => {
		const result = service.suggestTags("Angular", "desc", "body");
		expect(result).toBeDefined();
		expect(typeof result.subscribe).toBe("function");
	});

	// AK-13b: emits 3-6 tags
	it("emits between 3 and 6 tags", async () => {
		let tags: string[] = [];
		service
			.suggestTags("Angular", "A guide to Angular", "Angular is great")
			.subscribe((t) => (tags = t));
		await vi.advanceTimersByTimeAsync(500);
		expect(tags.length).toBeGreaterThanOrEqual(3);
		expect(tags.length).toBeLessThanOrEqual(6);
	});

	// AK-13c: all tags are lowercase and well-formed (no malformed entries)
	it("emits only non-empty lowercase hyphenated tags", async () => {
		let tags: string[] = [];
		service
			.suggestTags("Angular", "A guide to Angular", "Angular is great")
			.subscribe((t) => (tags = t));
		await vi.advanceTimersByTimeAsync(500);
		expect(tags.length).toBeGreaterThan(0);
		tags.forEach((tag) => {
			expect(tag.length).toBeGreaterThan(0);
			expect(tag).toMatch(/^[a-z0-9-]+$/);
		});
	});

	// AK-13d: result is deterministic for same inputs
	it("returns the same tags for the same inputs (deterministic)", async () => {
		let tags1: string[] = [];
		let tags2: string[] = [];
		service
			.suggestTags("My Title", "My Description", "My Body")
			.subscribe((t) => (tags1 = t));
		await vi.advanceTimersByTimeAsync(500);
		service
			.suggestTags("My Title", "My Description", "My Body")
			.subscribe((t) => (tags2 = t));
		await vi.advanceTimersByTimeAsync(500);
		expect(tags1).toEqual(tags2);
		expect(tags1.length).toBeGreaterThan(0);
	});

	// AK-13d: different inputs yield different results
	it("returns different tags for different inputs", async () => {
		let tags1: string[] = [];
		let tags2: string[] = [];
		service
			.suggestTags("Title Alpha", "Desc Alpha", "Body Alpha")
			.subscribe((t) => (tags1 = t));
		await vi.advanceTimersByTimeAsync(500);
		service
			.suggestTags("Title Beta", "Desc Beta", "Body Beta")
			.subscribe((t) => (tags2 = t));
		await vi.advanceTimersByTimeAsync(500);
		expect(JSON.stringify(tags1)).not.toBe(JSON.stringify(tags2));
	});

	// AK-13e + AK-5: no HTTP request is triggered
	it("does not make any HTTP request", async () => {
		let tags: string[] = [];
		service.suggestTags("test", "test", "test").subscribe((t) => (tags = t));
		await vi.advanceTimersByTimeAsync(500);
		expect(tags.length).toBeGreaterThan(0);
		// Fails if the service issued any request through HttpClient
		httpMock.expectNone(() => true);
		httpMock.verify();
	});

	// AK-4: has an async delay before emitting
	it("does not emit synchronously (includes async delay)", async () => {
		let emitted = false;
		service.suggestTags("Angular", "desc", "body").subscribe(() => {
			emitted = true;
		});
		// Before advancing timers, should not have emitted yet
		expect(emitted).toBe(false);
		await vi.advanceTimersByTimeAsync(300);
		expect(emitted).toBe(true);
	});
});
