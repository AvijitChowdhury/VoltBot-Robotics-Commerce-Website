# VoltBot E2E Tests

Playwright + pytest + Allure suite that walks every public route, captures
screenshots and produces an Allure HTML report.

## Setup

```bash
python -m pip install -r tests/e2e/requirements.txt
python -m playwright install chromium
```

## Run

Start the dev server first (`bun run dev`) and then:

```bash
python -m pytest tests/e2e --alluredir=allure-results
```

Point at a different origin:

```bash
E2E_BASE_URL=https://roboticsavijit.lovable.app python -m pytest tests/e2e
```

## Allure report

```bash
# install once: https://allurereport.org/docs/install/
allure generate allure-results -o allure-report --clean
allure open allure-report
```

## Layout

```
tests/e2e/
├── README.md
├── pytest.ini
├── requirements.txt
├── test_site.py           # 9 tests, one per public route + console-error probe
└── screenshots/           # written by the suite; gitignored
```

Sample captures and Allure screenshots are checked in under `docs/screenshots/`
and `docs/allure/` for the project README.
