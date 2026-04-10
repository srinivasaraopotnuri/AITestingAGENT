import type { TestPlanSections } from '@/types'

// Single source of truth for template section order and labels
export const TEMPLATE_SECTIONS: { key: keyof TestPlanSections; label: string; humanOnly: boolean }[] = [
  { key: 'objective',                label: 'Objective',                  humanOnly: false },
  { key: 'scope',                    label: 'Scope',                      humanOnly: false },
  { key: 'inclusions',               label: 'Inclusions',                 humanOnly: false },
  { key: 'testEnvironments',         label: 'Test Environments',          humanOnly: false },
  { key: 'defectReportingProcedure', label: 'Defect Reporting Procedure', humanOnly: false },
  { key: 'testStrategy',             label: 'Test Strategy',              humanOnly: false },
  { key: 'testSchedule',             label: 'Test Schedule',              humanOnly: false },
  { key: 'testDeliverables',         label: 'Test Deliverables',          humanOnly: false },
  { key: 'entryCriteria',            label: 'Entry Criteria',             humanOnly: false },
  { key: 'exitCriteria',             label: 'Exit Criteria',              humanOnly: false },
  { key: 'testExecution',            label: 'Test Execution',             humanOnly: false },
  { key: 'testClosure',              label: 'Test Closure',               humanOnly: false },
  { key: 'tools',                    label: 'Tools',                      humanOnly: false },
  { key: 'risksAndMitigations',      label: 'Risks and Mitigations',      humanOnly: false },
  { key: 'approvals',                label: 'Approvals',                  humanOnly: true  },
]

export const TEST_PLAN_SYSTEM_PROMPT = `You are a senior QA engineer with 15 years of experience writing formal test plans for enterprise software. You write in a clear, professional style with specific details drawn directly from the feature under test. You never use generic filler text. You always produce thorough, multi-point sections. You respond with pure JSON only — no markdown, no code fences, no commentary outside the JSON object.`

export function buildLLMPrompt(
  userStory: string,
  prd: string,
  acceptanceCriteria: string,
  additionalContext: string,
  ticketId: string
): string {
  return `Generate a comprehensive test plan for the following ticket. Return ONLY a valid JSON object with the exact keys shown in the example below. Each section must be specific to this feature — never generic.

---
TICKET: ${ticketId}

USER STORY:
${userStory || 'Not provided'}

PRD:
${prd || 'Not provided'}

ACCEPTANCE CRITERIA:
${acceptanceCriteria || 'Not provided'}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}` : ''}
---

Use the following as a quality benchmark for how detailed each section should be:

EXAMPLE OUTPUT (for a "User Login with MFA" feature — match this level of depth):
{
  "objective": "Verify that the User Login with MFA feature functions correctly across all supported authentication methods, handles error states gracefully, and meets the security and performance requirements defined in the acceptance criteria. This plan covers end-to-end login flows including OTP via SMS, email, and authenticator apps, as well as account lockout behavior after failed attempts.",
  "scope": "In scope: all login flows (email+password, SSO, MFA via SMS/email/TOTP), session management, account lockout, password reset integration, and cross-browser compatibility. Out of scope: registration flow, billing, and third-party OAuth provider internals.",
  "inclusions": "- Functional login with valid credentials\\n- MFA enrollment and verification (SMS, email, TOTP)\\n- Invalid credentials and error messages\\n- Account lockout after 5 failed attempts and unlock flow\\n- Session expiry and re-authentication\\n- Remember device functionality\\n- Concurrent login from multiple devices\\n- Cross-browser and cross-platform testing",
  "testEnvironments": "- Windows 11 / Chrome 120 (primary)\\n- Windows 11 / Firefox 121\\n- macOS Sonoma / Safari 17\\n- macOS Sonoma / Chrome 120\\n- iOS 17 / Safari (iPhone 14)\\n- Android 14 / Chrome (Samsung Galaxy S23)\\n- Staging environment connected to mock SMS/email gateway",
  "defectReportingProcedure": "Defects are logged in Jira under project QA with priority: Critical (login broken for all users), High (MFA not working for one method), Medium (UI issues, non-blocking errors), Low (cosmetic). All Critical and High defects trigger immediate Slack notification to #qa-alerts. SLA: Critical = same day, High = 24h, Medium = 72h, Low = next sprint.",
  "testStrategy": "Testing approach combines functional testing (positive/negative paths), security testing (brute force, session hijacking), boundary value analysis (exactly 5 failed attempts before lockout), and exploratory testing for edge cases. Regression suite covers all previously passing login scenarios. Automation covers smoke tests and the MFA happy path; manual testing covers all error states and security edge cases.",
  "testSchedule": "- Test case creation and review: 2 days\\n- Test environment setup and data prep: 1 day\\n- Functional test execution (manual): 3 days\\n- Automated regression run: 0.5 days\\n- Defect fix verification and re-test: 1 day\\n- UAT sign-off: 1 day\\nTotal: ~8.5 days",
  "testDeliverables": "- Test Plan document (this document)\\n- Test cases in Jira Xray (linked to ticket)\\n- Automated regression scripts (Playwright)\\n- Daily test execution status report\\n- Final defect summary report\\n- Test closure sign-off email",
  "entryCriteria": "- Build deployed to staging and smoke test passed\\n- Test cases reviewed and approved by lead QA\\n- MFA test accounts provisioned (SMS/email/TOTP)\\n- Mock SMS/email gateway configured in staging\\n- All High/Critical defects from previous sprint closed",
  "exitCriteria": "- 100% of Critical and High priority test cases executed and passed\\n- Zero open Critical or High defects\\n- All MFA methods (SMS, email, TOTP) verified working\\n- Automated regression suite green\\n- Performance: login + MFA under 3 seconds on staging\\n- QA sign-off obtained from QA lead and product owner",
  "testExecution": "Test execution follows a top-down order: smoke tests first, then functional happy paths, then negative/edge cases, then security tests, then cross-browser. Failed tests are logged immediately in Jira and re-tested after developer fix. A daily stand-up at 9am tracks execution progress. Final execution report is shared with stakeholders at closure.",
  "testClosure": "Testing is closed once all exit criteria are met and sign-off is obtained. A closure report is generated summarizing: total tests executed, pass/fail counts, defects found/fixed/deferred, and lessons learned. Test artifacts are archived in Confluence under the QA folder for the release. Deferred defects are backlogged with agreed priority for the next sprint.",
  "tools": "- Jira + Xray: test case management and defect tracking\\n- Playwright (TypeScript): UI test automation\\n- Postman: API-level MFA endpoint testing\\n- BrowserStack: cross-browser and mobile testing\\n- Twilio sandbox: mock SMS gateway\\n- Mailosaur: mock email OTP capture\\n- Grafana: monitor login API latency during test runs",
  "risksAndMitigations": "- Risk: SMS gateway unavailable in staging → Mitigation: use mock Twilio sandbox; test TOTP and email paths in parallel\\n- Risk: MFA token expiry causes flaky tests → Mitigation: sync test runner clock with NTP; use short-expiry tokens in test env\\n- Risk: Account lockout interferes with parallel test runs → Mitigation: provision dedicated test accounts per tester\\n- Risk: Cross-browser inconsistency in OTP input field → Mitigation: run automated cross-browser suite daily; log deviations immediately"
}

Now generate the same quality test plan for the ticket above. Return ONLY the JSON object.`
}
