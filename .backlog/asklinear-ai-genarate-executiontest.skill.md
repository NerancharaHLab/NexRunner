---
name: asklinear-ai-genarate-executiontest
description: Generate QA execution test structure (EXE -> Scenario -> Test Case) from Linear requirements following strict naming rules, QA label groups, and template structures.
---

Read the requirement issue first and use it as the only source of truth.

Generate execution test structure under the requirement using only this hierarchy:

Requirement

EXE

Scenario

Test Case

Follow these rules strictly:

Do not change naming patterns.

Do not change section order.

Do not rename section headings.

Do not omit any required section.

Do not add extra sections unless the user explicitly asks.

Do not add BDD unless explicitly requested.

Do not combine multiple checks in one Test Case.

Write Test Case names in Thai only.

Keep all content concise, practical, and execution-oriented.

Preserve the exact template even when information is missing.

If information is missing, keep the heading or field and fill only -.

Do not infer, draft, or expand missing content.

Naming rules

Use these exact title formats:

EXE: EXE - <Run Type> - <Scope/Version>

Scenario: TS-<Requirement ID>-<Suffix> - <Scenario Name>

Test Case: TC-<Requirement ID>-<3-digit sequence> - <Test Case Name>

If execution-priority tags are requested, use:

[Required] TC-<Requirement ID>-<3-digit sequence> - <Test Case Name>

[Optional] TC-<Requirement ID>-<3-digit sequence> - <Test Case Name>

Allowed Run Type abbreviations only:

CT

RT

RG

SM

Allowed Scenario suffix only:

HPY

UHP

EDG

ERR

If suffix conflicts with Case Type, keep Case Type as source of truth and fix the suffix.

Test Case naming pattern

Use this pattern for every Test Case name:

[คำนำหน้า/กริยา] + [สิ่งที่ต้องการตรวจ] + [เงื่อนไข/กรณีที่ทดสอบ]

Use clear QA verbs such as:

ตรวจสอบ...

ทดสอบ...

แสดง...

บันทึก...

คำนวณ...

Field rules

Clone requirement context whenever possible.

Use the requirement as source of truth for:

module

delivery/scope

version

project

Do not invent missing module, delivery/scope, or version values.

Assign EXE, Scenario, and Test Case to the current user by default.

Use the same project as the requirement if present.

Default statuses:

EXE = Ready for Testing

Scenario = Ready for Testing

Test Case = Not Run

Allowed EXE and Scenario statuses:

ToDo

Ready for Testing

Testing

Blocked

Done

Canceled

Allowed Test Case statuses:

Not Run

Passed

Failed

Blocked

Not Test

Body rules

Use the exact templates below.
Do not change heading names.
Do not change heading order.
If requirement detail is missing, keep the section and fill only - in the missing field, bullet, or numbered item.
Do not omit sections.

EXE body template

ข้อมูลรอบทดสอบ

ประเภทการทดสอบ: <Run Type>

Scope / Version: <Scope/Version>

Module: <Module or ->

Requirement ที่อ้างอิง: <Requirement identifier/title>

Environment: <Environment or ->

ขอบเขตการทดสอบ

<scope item 1>

<scope item 2>

หมายเหตุ

สร้างจาก Acceptance Criteria ของ requirement โดยตรง

ไม่รวม BDD ตามกติกาปัจจุบัน

Scenario body template

ข้อมูลอ้างอิง

Scenario ID: <Scenario ID>

Case Type: <Happy/Unhappy/Edge/Error>

Suffix: <HPY/UHP/EDG/ERR>

Module: <Module or ->

Requirement ที่อ้างอิง: <Requirement identifier/title>

วัตถุประสงค์

<objective>

ขอบเขต Requirement

<requirement scope item 1>

<requirement scope item 2>

ความเสี่ยง

<risk item>

หมายเหตุ

อิงตาม Acceptance Criteria ของ requirement

Use plain text only for Scenario ID.

Test Case body template

ข้อมูลอ้างอิง

TC ID: <TC ID>

Scenario ID: <Scenario ID>

Case Type: <Happy/Unhappy/Edge/Error>

Test Level: System

Test Type: <Functional/UIUX/Security/Integration/Performance>

Priority: <High/Medium/Low>

Requirement ที่อ้างอิง: <Requirement identifier/title>

Preconditions

<precondition 1>

<precondition 2>

Test Data

<test data item>

Test Steps

<step 1>

<step 2>

Expected Result

<expected result 1>

หมายเหตุ

<note>

Use plain text only for TC ID and Scenario ID.

Label rules

Clone labels from the requirement.

Apply labels by level:

EXE: requirement labels only

Scenario: requirement labels + QA Case

Test Case: requirement labels + QA Case + QA Type

Do not use legacy labels.
Do not invent unapproved QA labels.

Generation rules

Generate from Acceptance Criteria first.
Acceptance Criteria are minimum required coverage.
Add extra coverage only when there is a clear risk or coverage gap.
If behavior exists in Acceptance Criteria but not yet in UI, the Test Case may still be created.

If requirement is unclear:

identify the gap briefly

ask only for missing critical information

or return the same template structure with - in missing content

Subject-only rules

If the requirement has no Acceptance Criteria:

treat output as Draft Coverage

If only the subject is available:

generate high-level scenarios first

do not invent hidden business rules

create detailed Test Cases only for behaviors that can be inferred with high confidence

If detail is too vague:

return the same template structure with - in missing content

list requirement gaps grouped by:

expected behavior

validation

error handling

permission/role

edge cases

Final consistency check

Before final output or creation, verify all of the following:

titles match the required format exactly

version is consistent across title, body, and labels

Scenario ID and TC ID are plain text

Test Level is System

Priority in body uses only High, Medium, or Low

no section is missing

no extra section is added

no multi-behavior Test Case exists

If any mismatch is found, fix it before returning the result.

Creation behavior

If the user asks for draft only:

return proposed EXE, Scenario, and Test Case structure only

If creation is requested:

present the proposed structure first when it is non-trivial

revise if requested

create only after explicit confirmation

Keep the structure minimal and practical.