import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** Open a custom Select and pick an option by its visible label. */
export async function chooseOption(
  user: UserEvent,
  comboboxName: RegExp | string,
  optionName: RegExp | string,
): Promise<void> {
  await user.click(await screen.findByRole('combobox', { name: comboboxName }));
  await user.click(await screen.findByRole('option', { name: optionName }));
}

/** Visible option labels of a custom Select, opening it if needed. */
export async function optionLabels(
  user: UserEvent,
  comboboxName: RegExp | string,
): Promise<string[]> {
  await user.click(await screen.findByRole('combobox', { name: comboboxName }));
  const listbox = await screen.findByRole('listbox');
  return within(listbox)
    .getAllByRole('option')
    .map((option) => option.textContent ?? '');
}
