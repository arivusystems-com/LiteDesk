# Field Governance Tests

This directory contains tests for the field governance model.

## Test Files

- `fieldGovernance.test.js` - Unit tests for field access control utilities
- `fieldGovernance.integration.test.js` - Integration test template (requires database)

## Running Tests

### Prerequisites

Install a test framework (Jest recommended):

```bash
cd server
npm install --save-dev jest
```

### Run Unit Tests

```bash
npm test fieldGovernance.test.js
```

Or with Jest:

```bash
npx jest fieldGovernance.test.js
```

### Run Integration Tests

Integration tests require:
- MongoDB test database
- Test user/organization setup
- API endpoint testing (supertest)

```bash
npm test fieldGovernance.integration.test.js
```

## Test Coverage

### Unit Tests Cover:

1. **Field Ownership Rules**
   - Platform-owned fields (read/write access)
   - App-owned fields (read/write access)
   - Org-owned fields (read/write access)

2. **Context Rules**
   - Global fields visibility
   - App-specific fields visibility

3. **Access Control Rules**
   - READ access filtering
   - WRITE access filtering
   - Field write validation

4. **Edge Cases**
   - Missing users/fields
   - Default values
   - Module aliases
   - Empty arrays

5. **Integration Scenarios**
   - Complete filtering workflows
   - Multiple field types
   - Multiple user roles

### Integration Tests Cover:

1. **API Endpoint Enforcement**
   - Field mutation restrictions
   - Context filtering in responses
   - Access control in updates

2. **App Uninstall**
   - Field cleanup
   - Data preservation

3. **End-to-End Scenarios**
   - Complete field lifecycle
   - Cross-context visibility
   - Role-based access changes

## Test Structure

Tests follow the structure of `/docs/field-governance.md`:

- Section 1: Field Ownership Rules
- Section 2: Context Rules
- Section 3: Access Control Rules
- Section 4: Edge Cases
- Section 5: Integration Scenarios

## Adding New Tests

When adding new tests:

1. Follow the existing test structure
2. Reference `/docs/field-governance.md` for rules
3. Test both positive and negative cases
4. Include edge cases and fail-safe behavior
5. Update this README if adding new test categories

## Notes

- Unit tests are framework-agnostic (can work with Jest, Mocha, etc.)
- Integration tests require database setup
- All tests validate invariants from the governance document
- Tests should fail if governance rules are violated

