# Localization Guide

This document describes the internationalization (i18n) workflow for the JupyterLab extension.

## Important Notes

⚠️ **Never edit these files manually:**

- `.pot` file - Generated only by `extract` command
- `msgid` in `.po` files - Reflect source code changes via `extract` → `update`
- `.mo`, `.json` files - Generated only by `compile` command

## Localization Workflow

### Step 1: Identify Text for Translation

Find text displayed to users:

- Dialog title, body, and buttons
- Text displayed in JSX
- label, tooltip, placeholder attribute values
- User notifications and error messages

### Step 2: Add ITranslator to Plugin

```typescript
import { ITranslator } from '@jupyterlab/translation';

const EXTENSION_ID = 'jupyterlab_judge';

export const myPlugin: JupyterFrontEndPlugin<void> = {
  requires: [ITranslator],
  activate: (app, translator: ITranslator) => {
    const trans = translator.load(EXTENSION_ID);
    // Pass trans to components that need it
  }
};
```

### Step 3: Apply trans.__() in Code (Use English)

Write strings in English and wrap them with `trans.__()`.

```typescript
// Before
showDialog({
  title: '제출하시겠습니까?',
  body: '코드를 제출합니다.',
  buttons: [
    Dialog.cancelButton({ label: '취소' }),
    Dialog.okButton({ label: '제출' })
  ]
});

// After (use English)
showDialog({
  title: trans.__('Submit?'),
  body: trans.__('Submit your code.'),
  buttons: [
    Dialog.cancelButton({ label: trans.__('Cancel') }),
    Dialog.okButton({ label: trans.__('Submit') })
  ]
});
```

For components without trans, pass it via props:

```typescript
import { TranslationBundle } from '@jupyterlab/translation';

function MyComponent(props: { trans: TranslationBundle }) {
  const { trans } = props;
  return <div>{trans.__('Hello World')}</div>;
}
```

### Step 4: Extract Translation Strings

Use jupyterlab-translate to extract English strings from code.

```bash
jupyterlab-translate extract . jupyterlab_judge
```

This generates the `jupyterlab_judge/locale/jupyterlab_judge.pot` file.

### Step 5: Create/Update .po Files and Add Translations

```bash
jupyterlab-translate update . jupyterlab_judge -l ko_KR
```

This creates/updates `jupyterlab_judge/locale/ko_KR/LC_MESSAGES/jupyterlab_judge.po`.

Example .po file:

```po
msgid ""
msgstr ""
"Content-Type: text/plain; charset=utf-8\n"
"Language: ko-KR\n"

msgid "Submit?"
msgstr "제출하시겠습니까?"

msgid "Submit your code."
msgstr "코드를 제출합니다."

msgid "Cancel"
msgstr "취소"

msgid "Submit"
msgstr "제출"
```

Open the .po file and add translations for each `msgstr` entry.

### Step 6: Compile Translation Files

```bash
jupyterlab-translate compile . jupyterlab_judge -l ko_KR
```

This compiles .po files into .mo and .json files:

- `jupyterlab_judge/locale/ko_KR/LC_MESSAGES/jupyterlab_judge.mo`
- `jupyterlab_judge/locale/ko_KR/LC_MESSAGES/jupyterlab_judge.json`

### Step 7: Build and Test

```bash
jlpm build
```

Verify there are no TypeScript errors.

## References

Official documentation:

- [JupyterLab Internationalization](https://jupyterlab.readthedocs.io/en/stable/extension/internationalization.html)
- [jupyterlab-translate](https://github.com/jupyterlab/jupyterlab-translate)
