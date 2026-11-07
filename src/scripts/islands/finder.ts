/** Browser code for the system finder island. The decision itself is lib/finder.ts. */
import type { Sections } from '../../lib/schemas/sections';
import {
  cutsQuestionApplies,
  DEFAULT_ANSWERS,
  recommendSystem,
  type FinderAnswers,
} from '../../lib/finder';
import { readIslandData } from '../hydrate';

type FinderResults = Sections['systems']['finder']['results'];

export function initFinder(root: HTMLElement): void {
  const results = readIslandData<FinderResults>(root, 'finder');
  if (!results) return;

  const section = root.closest('[data-systems]') ?? document;
  const answers: FinderAnswers = { ...DEFAULT_ANSWERS };
  const name = root.querySelector('[data-result-name]');
  const why = root.querySelector('[data-result-why]');
  const cutsBlock = root.querySelector<HTMLElement>('[data-cuts]');
  const groups = [...root.querySelectorAll<HTMLElement>('[data-question]')];

  const render = () => {
    const pick = recommendSystem(answers);
    const result = results[pick];
    if (name) name.textContent = result.name;
    if (why) why.textContent = result.why;

    const cutsOn = cutsQuestionApplies(answers);
    cutsBlock?.classList.toggle('off', !cutsOn);
    cutsBlock?.querySelectorAll('button').forEach((b) => (b.disabled = !cutsOn));

    section
      .querySelectorAll<HTMLElement>('[data-system]')
      .forEach((cell) => cell.classList.toggle('pick', cell.dataset.system === pick));
  };

  groups.forEach((group) => {
    const question = group.dataset.question as keyof FinderAnswers | undefined;
    if (!question) return;
    group.querySelectorAll<HTMLButtonElement>('button[data-value]').forEach((button) => {
      button.addEventListener('click', () => {
        if (question === 'grid') answers.grid = button.dataset.value === 'no' ? 'no' : 'yes';
        else answers.cuts = button.dataset.value === 'often' ? 'often' : 'rare';
        group
          .querySelectorAll('button[data-value]')
          .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        render();
      });
    });
  });
  root.dataset.ready = 'true';
}
