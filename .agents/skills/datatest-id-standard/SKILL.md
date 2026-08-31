---
name: datatest-id-standard
description: Guidelines and rules for generating, naming, and validating data-testid attributes for HIS (Cortex) UI elements to prevent collisions and support automated testing.
---

# data-testid Naming Standard for HIS (Cortex)

This guide defines the naming standard for the `data-testid` attribute on UI elements in the HIS (Cortex) system. Adhering to this standard prevents naming collisions, ensures reliable Playwright E2E automation, and aligns development practices across UI Developers and QA.

---

## 📐 Syntax Pattern

The standard format for naming `data-testid` is:

$$\Large \text{data-testid} = \text{[module]:[component]:[element]\_\/[modifier]}$$

*   **Colon (`:`)**: Separates scopes/namespaces (Namespace / Scope Separation).
*   **Double Underscore (`__`)**: Separates sub-states, actions, or dynamic variables (Action / Modifier / Dynamic Variable Separation).

---

## 🔍 Segment Breakdown

### 1. `[module]` (Main System Module)
*   **Definition**: Identifies the high-level system module.
*   **Format**: Lowercase English letters only, no spaces.
*   **Examples**:
    *   `registration` ➡️ Patient Registration / Medical Records
    *   `opd` ➡️ Outpatient Department
    *   `cpoe` ➡️ Computerized Physician Order Entry
    *   `cashier` ➡️ Billing / Cashier
    *   `pharmacy` ➡️ Pharmacy Department

### 2. `[component]` (UI Page Section / Component)
*   **Definition**: Identifies the specific screen area, form, or sub-component containing the element.
*   **Format**: Lowercase English letters, using kebab-case for multi-word names.
*   **Examples**:
    *   `patient-form` ➡️ Patient Information Form
    *   `vital-signs` ➡️ Triage Vital Signs Section
    *   `prescription-list` ➡️ Doctor's Prescription List
    *   `queue-table` ➡️ Patient Queue Grid

### 3. `[element]` (UI Element Type Abbreviation)
*   **Definition**: Specifies the type of control to clarify expected interactions.
*   **Standard Abbreviations**:
    *   `btn` ➡️ Generic Button
    *   `input` ➡️ Text input, Textarea
    *   `select` ➡️ Dropdown select, Autocomplete dropdown
    *   `chk` ➡️ Checkbox
    *   `rad` ➡️ Radio button
    *   `tbl` ➡️ Data table
    *   `modal` ➡️ Pop-up dialog or Modal window
    *   `card` ➡️ Card container
    *   `tab` ➡️ Tab selector
    *   `txt` ➡️ Static text or label (typically used for assertions)

### 4. `[modifier]` (Action, Context, or Dynamic Value)
*   **Definition**: Represents the specific action, field property, or dynamic key.
*   **Format**: Lowercase for static actions/fields; uses actual system IDs or HN format for dynamic values.
*   **Examples**:
    *   `save` ➡️ Save action
    *   `cancel` ➡️ Cancel action
    *   `hn` ➡️ Field for Hospital Number (HN)
    *   `HN0019283` ➡️ Identifies a specific record's primary key (e.g., patient HN)

---

## 💡 Real-world Examples

### 1. Patient Registration Form (Static Screens)
*   **ID Card (CID) input field**:
    ```html
    <input data-testid="registration:patient-form:input__cid" type="text" />
    ```
*   **Gender select dropdown**:
    ```html
    <select data-testid="registration:patient-form:select__gender">...</select>
    ```
*   **Submit form button**:
    ```html
    <button data-testid="registration:patient-form:btn__submit">Submit</button>
    ```

### 2. Identical Buttons on Different Sections (Collision Prevention)
*   **Save button on OPD Triage section**:
    ```html
    <button data-testid="opd:triage:btn__save">Save</button>
    ```
*   **Save button on CPOE Prescription list**:
    ```html
    <button data-testid="cpoe:prescription:btn__save">Save</button>
    ```

### 3. Dynamic Lists and Tables (Dynamic Identifiers)
*   **Table row for patient with HN 0029381**:
    ```html
    <tr data-testid="opd:queue-table:row__HN0029381">...</tr>
    ```
*   **View record button inside that specific row**:
    ```html
    <button data-testid="opd:queue-table:btn-view__HN0029381">View</button>
    ```

---

## 🛠️ Implementation Best Practices for UI Developers

1.  **Always include the module namespace**: Every `data-testid` must start with `[module]:` to keep scopes clean.
2.  **Use lowercase (except for keys)**: Module, component, element, and static modifiers must be lowercase. Only actual dynamic system keys (e.g., `HN001234`) should preserve casing.
3.  **Use English only**: Do not use non-English characters in `data-testid` values.
4.  **Avoid coupling with CSS classes or button text**: Button labels change (e.g., due to localization/translations), but `data-testid` must remain static to prevent automated test failures.
5.  **React/JSX Implementation Example**:
    ```jsx
    // Static element
    <Button data-testid="pharmacy:dispensing:btn__confirm">Confirm Dispense</Button>

    // Dynamic list mapping
    {drugs.map(drug => (
      <tr key={drug.id} data-testid={`pharmacy:drug-table:row__${drug.id}`}>
        <td>{drug.name}</td>
        <td>
          <button data-testid={`pharmacy:drug-table:btn-delete__${drug.id}`}>
            Delete
          </button>
        </td>
      </tr>
    ))}
    ```

---

## 🔍 Validation Checklist

- [ ] Does the `data-testid` follow the 3-4 segment structure, separated by `:` and `__`?
- [ ] Are the module and component segments written in lowercase, using kebab-case for multiple words?
- [ ] Does it use standard element abbreviations (`btn`, `input`, `select`, etc.)?
- [ ] If a modifier is present, is it prefixed with a double underscore `__`?
- [ ] Has it been verified that no duplicate IDs exist on the same viewport/screen context?
