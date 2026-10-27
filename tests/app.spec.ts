import { expect, test, type Page } from "@playwright/test";

type Word = { id: string; word: string; en: string; gre?: { s: string; pair: string; trap: string } };

/** The word list as the app sees it once stories and GRE items have loaded. */
async function allWords(request: import("@playwright/test").APIRequestContext): Promise<Word[]> {
  const core: Word[] = await (await request.get("./data/vocab.json")).json();
  const details: Record<string, Partial<Word>> = await (await request.get("./data/details.json")).json();
  return core.map((w) => ({ ...w, ...details[w.id] }));
}

/** Fail the test on any uncaught error or console error. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

/** Start as a returning learner who has finished the welcome. */
async function skipWelcome(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem("gre-vocab-progress-v1"))
      localStorage.setItem("gre-vocab-progress-v1", JSON.stringify({ settings: { onboarded: true } }));
  });
}

test("first run: welcome, plan, level check, first lesson", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Shobdo Quest" })).toBeVisible();
  await page.getByRole("button", { name: "Let's begin" }).click();
  await expect(page.getByText("When is your GRE?")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "I'm a beginner, skip the check" }).click();
  await page.getByRole("button", { name: "Start set 1" }).click();
  await expect(page.locator(".word-detail")).toBeVisible();
  expect(errors).toEqual([]);
});

test("learn a set, then review with the card flip", async ({ page }) => {
  const errors = watchErrors(page);
  await skipWelcome(page);
  await page.goto("./#/learn/2");
  await expect(page.locator(".word-detail")).toBeVisible();
  for (let i = 0; i < 30; i++) await page.keyboard.press("1");
  await expect(page.locator(".done-card")).toBeVisible();
  // Words rated "Need practice" come back in minutes; make them due now.
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("gre-vocab-progress-v1")!);
    for (const c of Object.values(p.cards) as { due: string }[]) c.due = new Date(Date.now() - 60_000).toISOString();
    localStorage.setItem("gre-vocab-progress-v1", JSON.stringify(p));
  });
  await page.goto("./#/review");
  await page.reload();
  await page.getByRole("button", { name: /Show answer/ }).click();
  await expect(page.locator(".flashcard.flip-in")).toBeVisible();
  await page.getByRole("button", { name: /Good/ }).click();
  await expect(page.getByText("29 left")).toBeVisible();
  expect(errors).toEqual([]);
});

test("GRE Text Completion: right answers score, the explanation shows the clue", async ({ page, request }) => {
  const errors = watchErrors(page);
  await skipWelcome(page);
  const words = await allWords(request);
  const byWord = new Map(words.map((w) => [w.word, w]));
  await page.goto("./#/quiz/group/3");
  await page.locator(".mode-card", { has: page.locator("strong", { hasText: /^Text Completion$/ }) }).click();
  await page.getByRole("button", { name: "Start" }).click();
  for (let i = 0; i < 10; i++) {
    await expect(page.locator(".gre-sentence")).toBeVisible();
    const sentence = (await page.locator(".gre-sentence").textContent())!.replace(/\s+/g, " ");
    const options = await page.locator(".option > span").allTextContents();
    const norm = (x: string) => x.replace(/\s+/g, " ").trim();
    // The option whose GRE sentence matches the text on both sides of the blank.
    const answer = options.find((o) => {
      const s = byWord.get(o)?.gre?.s;
      if (!s) return false;
      const [pre, post] = s.split("____");
      return norm(sentence).startsWith(norm(pre.replace(/\b([Aa])n? $/, "$1(n) "))) && norm(sentence).endsWith(norm(post));
    });
    expect(answer, sentence).toBeTruthy();
    await page.locator(".option", { hasText: new RegExp(`^\\s*\\d?\\s*${answer}\\s*$`) }).click();
    await expect(page.locator(".feedback.ok")).toBeVisible();
    await expect(page.locator("mark.clue")).toBeVisible();
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".score-ring")).toContainText("100%");
  expect(errors).toEqual([]);
});

test("Sentence Equivalence needs both correct words", async ({ page, request }) => {
  await skipWelcome(page);
  const words = await allWords(request);
  await page.goto("./#/quiz/group/5");
  await page.locator(".mode-card", { has: page.locator("strong", { hasText: /^Sentence Equivalence$/ }) }).click();
  await page.getByRole("button", { name: "Start" }).click();
  const sentence = (await page.locator(".gre-sentence").textContent())!.replace(/\s+/g, " ");
  const options = await page.locator(".option > span").allTextContents();
  expect(options).toHaveLength(6);
  const w = words.find((x) => options.includes(x.word) && x.gre && options.includes(x.gre.pair) && sentence.includes(x.gre.s.split("____")[1].trim().slice(0, 20)))!;
  await page.locator(".option", { hasText: new RegExp(`^\\s*${w.word}\\s*$`) }).click();
  await expect(page.getByRole("button", { name: "Pick 1 more" })).toBeDisabled();
  await page.locator(".option", { hasText: new RegExp(`^\\s*${w.gre!.pair}\\s*$`) }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.locator(".feedback.ok")).toBeVisible();
});

test("Bangla interface, About page and privacy policy", async ({ page }) => {
  const errors = watchErrors(page);
  await skipWelcome(page);
  await page.goto("./#/settings");
  await page.getByLabel("Language").selectOption("bn");
  await page.goto("./#/");
  await expect(page.locator(".bottomnav, .topnav").first()).toContainText("হোম");
  await page.goto("./#/about");
  await expect(page.getByText("GRE® is a registered trademark of ETS")).toBeVisible();
  await page.goto("./#/privacy");
  await expect(page.getByText("does not collect, store or share any personal information")).toBeVisible();
  expect(errors).toEqual([]);
});

test("old progress ids carry over to the new word ids", async ({ page }) => {
  await page.addInitScript(() => {
    const card = { due: new Date(Date.now() - 1000).toISOString(), stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 0, learning_steps: 0, reps: 1, lapses: 0, state: 2 };
    localStorage.setItem("gre-vocab-progress-v1", JSON.stringify({ cards: { "01-abound": card }, starred: ["01-abound"], settings: {} }));
  });
  await page.goto("./#/review");
  await expect(page.locator(".flashcard")).toContainText("abound");
});
