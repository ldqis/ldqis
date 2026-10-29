##
## ldqis — LDQIS lab website
## Astro + Tailwind 4 + GitHub Pages
##
## Usage:
##   make help       Show all available commands
##   make setup      Install dependencies (clean install from package-lock.json)
##   make dev        Start the Astro dev server (interactive, hot reload)
##   make build      Production build into dist/
##   make preview    Serve the production build locally for verification
##   make check      Astro type-check
##   make fix        Auto-fix lint + format (one-way door)
##   make lint       ESLint + Prettier check (no auto-fix)
##   make test-unit  Vitest unit tests
##   make test-e2e   Playwright + axe-core e2e tests
##   make test       All tests (unit + e2e)
##   make validate   Fast pre-push gate (lint + check + unit + build)
##   make audit      npm audit (informational; transitive lhci deps noisy)
##   make lighthouse Lighthouse CI (perf / a11y / best-practices / SEO)
##   make clean      Remove dist/, .astro/, coverage/, playwright-report/, .lighthouseci/
##

.PHONY: help setup dev build preview check fix lint test-unit test-e2e test validate audit lighthouse clean
.DEFAULT_GOAL := help

# ════════════════════════════════════════════════════════════════════════════
# Help
# ════════════════════════════════════════════════════════════════════════════

help:                       ## Show this help
	@echo ""
	@echo "ldqis — LDQIS lab website"
	@echo ""
	@echo " Phase 1 — Setup"
	@echo " ───────────────"
	@echo "  setup       npm ci, clean install from package-lock.json"
	@echo ""
	@echo " Phase 2 — Fix (one-way door)"
	@echo " ────────────────────────────"
	@echo "  fix         ESLint + Prettier auto-fix; run before lint"
	@echo ""
	@echo " Phase 3 — Lint"
	@echo " ──────────────"
	@echo "  lint        ESLint --no-fix + Prettier --check"
	@echo "  check       Astro template + TypeScript type check"
	@echo ""
	@echo " Phase 4 — Test"
	@echo " ──────────────"
	@echo "  test-unit   Vitest"
	@echo "  test-e2e    Playwright + @axe-core/playwright (requires build first)"
	@echo "  test        Combined unit + e2e"
	@echo ""
	@echo " Phase 5 — End-to-end gates"
	@echo " ──────────────────────────"
	@echo "  build       Astro static build into dist/ (\"is it deployable\" probe)"
	@echo "  validate    Fast pre-push gate (lint + check + unit + build)"
	@echo "  audit       npm audit, informational"
	@echo "  lighthouse  Lighthouse CI (perf / a11y / best-practices / SEO)"
	@echo ""
	@echo " Interactive (do not run in CI)"
	@echo " ──────────────────────────────"
	@echo "  dev         Astro dev server, hot reload"
	@echo "  preview     Astro preview server, serves dist/"
	@echo ""
	@echo " Cleanup"
	@echo " ───────"
	@echo "  clean       Remove dist/, .astro/, coverage/, playwright-report/, .lighthouseci/"
	@echo ""

# ════════════════════════════════════════════════════════════════════════════
# Phase 1 — Setup
# ════════════════════════════════════════════════════════════════════════════

setup:                      ## Install dependencies (npm ci)
	@npm ci

# ════════════════════════════════════════════════════════════════════════════
# Phase 2 — Fix (one-way door)
# ════════════════════════════════════════════════════════════════════════════

fix:                        ## Auto-fix ESLint + Prettier
	@npm run lint
	@npm run format

# ════════════════════════════════════════════════════════════════════════════
# Phase 3 — Lint
# ════════════════════════════════════════════════════════════════════════════

lint:                       ## ESLint + Prettier check + README claim gate + ruff (no auto-fix)
	@npm run lint:check
	@npm run format:check
	@node scripts/check-readme-claims.mjs
	@uvx ruff@0.17.3 check

check:                      ## Astro template + TypeScript type check
	@npm run check

# ════════════════════════════════════════════════════════════════════════════
# Phase 4 — Test
# ════════════════════════════════════════════════════════════════════════════

test-unit:                  ## Vitest unit tests
	@npm run test:unit

test-e2e:                   ## Playwright + axe-core e2e (requires build first)
	@npm run test:e2e

test: test-unit test-e2e    ## Combined unit + e2e

# ════════════════════════════════════════════════════════════════════════════
# Phase 5 — End-to-end gates
# ════════════════════════════════════════════════════════════════════════════

build:                      ## Production build into dist/
	@npm run build

validate: lint check test-unit build  ## Fast pre-push gate

audit:                      ## npm audit (informational)
	@npm audit || true

lighthouse:                 ## Lighthouse CI (perf / a11y / best-practices / SEO)
	@npm run lighthouse

# ════════════════════════════════════════════════════════════════════════════
# Interactive
# ════════════════════════════════════════════════════════════════════════════

dev:                        ## Astro dev server with hot reload
	@npm run dev

preview:                    ## Serve the production build locally
	@npm run preview

# ════════════════════════════════════════════════════════════════════════════
# Cleanup
# ════════════════════════════════════════════════════════════════════════════

clean:                      ## Remove dist/, .astro/, caches; prune log archives > 30d
	@rm -rf dist .astro coverage playwright-report test-results .lighthouseci
	@find logs -name 'dev-*-*.log' ! -name '*-latest.log' -mtime +30 -delete 2>/dev/null || true
	@echo "Cleaned build + test caches"
