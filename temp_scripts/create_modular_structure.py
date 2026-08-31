# -*- coding: utf-8 -*-
import os
import json

# Ensure directories exist
os.makedirs('./scenarios', exist_ok=True)
os.makedirs('./css', exist_ok=True)
os.makedirs('./js', exist_ok=True)

# 1. Base Scenarios Template
nuh_scenarios = [
    { "id": "SC-01", "flow": "OPD", "name": "NUH: ลงทะเบียน คัดกรอง ก่อนเข้าตรวจ OPD", "desc": "ผู้ป่วย Walk-in ลงทะเบียนระบบ NUH-HIS แล้วถูกส่งต่อไปแผนกคัดกรอง และ เข้าคิว OPD", "role": "เวชระเบียน / พยาบาลคัดกรอง / พยาบาล OPD (NUH)", "critical": True, "steps": "1. ค้นหา/สร้าง HN ใน NUH-HIS -> ลงทะเบียน Visit -> พิมพ์ใบนำทาง NUH\n2. พยาบาลคัดกรองดู tab 'คำขอ Walk-in' -> บันทึก Vital Sign -> เลือกแพทย์/นัด -> พิมพ์บัตรคิว\n3. คิวขึ้น tab 'รอเช็คอิน' -> กด Check-in -> กดเรียกคิว -> กด 'พร้อมตรวจ'", "criteria": "สถานะผู้ป่วยเปลี่ยนเป็น 'กำลังดำเนินการ' และคิวแสดงหน้าห้องตรวจ NUH" },
    { "id": "SC-02 [A]", "flow": "OPD", "name": "NUH: แพทย์ตรวจ + วินิจฉัย + สั่ง Order (Lab/X-ray/ยา)", "desc": "พยาบาลหน้าห้องตรวจ NUH กดเรียกคิว ตรวจผู้ป่วย OPD พร้อมกัน เพื่อเข้าห้องตรวจ แล้วสั่ง Order", "role": "แพทย์ OPD / พยาบาลหน้าห้องตรวจ (NUH)", "critical": False, "steps": "1. พยาบาลกดเรียกคิวเข้าห้องตรวจ NUH\n2. แพทย์เปิด NUH-EMR เปลี่ยนสถานะ 'พร้อม' -> บันทึก Diagnosis (ICD-10)\n3. สั่ง Order ครบ 3 ชนิด (Lab + X-ray + ยา) ลงตะกร้า -> กด 'ส่งคำสั่ง' (Submit Order)", "criteria": "ส่ง Order ทั้งหมดสำเร็จในครั้งเดียว และสถานะผู้ป่วยเปลี่ยนเป็น 'พักการตรวจ'" },
    { "id": "SC-03", "flow": "OPD", "name": "NUH: ส่ง Lab/X-ray -> รับผล -> แพทย์อ่านผลต่อ", "desc": "ระบบ NUH ส่ง Order ไปห้อง Lab/X-ray และประมวลผล Lab/X-ray พร้อมแพทย์อ่านผลกลับเข้าตรวจต่อ", "role": "จนท. Lab / แพทย์ OPD (NUH)", "critical": False, "steps": "1. จนท. Lab เช็คอินรายการ -> เก็บตัวอย่าง (Container) -> ยืนยัน -> ลงผล Lab -> กด Final Report\n2. แพทย์เปิด NUH-EMR ดูผล -> เปลี่ยนสถานะ 'พร้อม' -> สั่งยาเพิ่ม/นัดหมาย/ออกใบรับรองแพทย์ -> กด 'ตรวจเสร็จ'", "criteria": "ผล Lab ออกสมบูรณ์ และแพทย์เปลี่ยนสถานะผู้ป่วยเป็น 'ตรวจเสร็จ'" },
    { "id": "SC-04", "flow": "OPD", "name": "NUH: เภสัชกรรม (สร้างใบยา) -> ชำระเงิน -> เภสัชกรรม จ่ายยา -> การเงินปิด Visit", "desc": "เภสัชกร NUH สร้างใบยาส่งต่อการเงินชำระเงินแล้วเภสัชกรจ่ายยาปิด Visit ให้ผู้ป่วย OPD", "role": "เภสัชกร OPD / การเงิน (NUH)", "critical": False, "steps": "1. เภสัชกรตรวจใบสั่งยา -> กด 'สร้างใบยา' -> กด 'ยืนยันใบยา' (ตัด Stock ยา NUH)\n2. การเงินออกใบแจ้งหนี้ -> รับชำระเงิน -> พิมพ์ใบเสร็จ NUH -> กด 'เสร็จสิ้น'\n3. เภสัชกรเห็นสถานะ 'ชำระเงินแล้ว' -> พิมพ์ฉลากยา/จัดยา -> กด 'จ่ายยา' + เรียกคิว", "criteria": "ตัด Stock ยาสำเร็จ ออกใบเสร็จเรียบร้อย และปิด Visit OPD สมบูรณ์" },
    { "id": "SC-02 [B]", "flow": "IPD", "name": "NUH: แพทย์วินิจฉัยแล้วสั่ง Admit โดยไม่มี Order", "desc": "แพทย์ NUH วินิจฉัยแล้วสั่ง Admit ผู้ป่วย OPD เข้า IPD ทันทีโดยไม่สั่ง Order", "role": "แพทย์ OPD / พยาบาล (NUH)", "critical": False, "steps": "1. พยาบาลเรียกคิว -> แพทย์เปิด EMR เปลี่ยนสถานะ 'พร้อม' -> ลงวินิจฉัย OPD Note\n2. แพทย์ประเมิน 'ต้อง Admit' -> กดปุ่ม 'สร้าง Admit Order' จาก NUH-EMR -> กรอกฟอร์ม -> Save", "criteria": "สถานะผู้ป่วยเปลี่ยนเป็น 'รอ Admit' และคำขอส่งไปศูนย์จัดการเตียง NUH" },
    { "id": "SC-05", "flow": "IPD", "name": "NUH: จองเตียง -> สร้าง AN (ต่อเนื่องจาก Scenario 2 [B])", "desc": "จนท.เตียง NUH จองเตียงและสร้าง AN ให้ผู้ป่วย Admit", "role": "จนท. ศูนย์จัดการเตียง (NUH)", "critical": True, "steps": "1. เข้าเมนู ศูนย์จัดการเตียง NUH -> tab 'คำขอ Admit' -> ค้นหาผู้ป่วย -> กด 'จองเตียง'\n2. เลือกวอร์ด/ประเภทเตียง/เตียง จากผังเตียง -> กดบันทึก\n3. กลับ tab 'คำขอ Admit' -> กดปุ่ม 'สร้าง AN'", "criteria": "ระบบ Generate AN สำเร็จ ข้อมูลย้ายไปแสดงใน tab 'AN'" },
    { "id": "SC-06", "flow": "IPD", "name": "NUH: ผู้ป่วยใน -> รายการเตียง หอผู้ป่วยใน", "desc": "พยาบาล Ward NUH เปิดรายการเตียงหอผู้ป่วยในและบันทึกเวลาผู้ป่วยมาถึงวอร์ด", "role": "พยาบาล Ward (NUH)", "critical": False, "steps": "1. เข้าเมนู ผู้ป่วยใน -> รายการเตียง -> เลือก Ward NUH -> กด ส่ง\n2. ไปที่ tab 'เตียงทั้งหมด' -> เลือกผู้ป่วย -> กด 3 จุด -> เลือก 'บันทึกมาถึงวอร์ด' -> บันทึกเวลา", "criteria": "บันทึกเวลาผู้ป่วยมาถึงวอร์ดสำเร็จ ผู้ป่วยแสดงสถานะพร้อมรับการดูแลบน Ward" },
    { "id": "SC-07", "flow": "IPD", "name": "NUH: แพทย์ตรวจ + วินิจฉัย + สั่ง Order (Lab/X-ray/ยา)", "desc": "แพทย์ Round ตรวจและสั่ง Order ยา/Lab/X-ray แบบ ONE DAY และ CONTINUE ให้ผู้ป่วย IPD NUH", "role": "แพทย์ IPD (NUH)", "critical": True, "steps": "1. เปิด EMR IPD NUH (ค้นด้วย AN) -> เข้าเมนู 'IPD Summary' -> บันทึก Progress Note\n2. เข้า tab 'Physician Order' -> สั่งออเดอร์ทั้ง 'One Day Order' และ 'Continue Order'\n3. กด บันทึก -> กดปุ่ม 'Sign All'", "criteria": "Order แสดงใน tab IPD Summary แยกกลุ่ม One Day / Continue ชัดเจน Status = 'รอรับ'" },
    { "id": "SC-08", "flow": "IPD", "name": "NUH: พยาบาลตรวจสอบ Order ยา และ Confirm รายการยา", "desc": "พยาบาลตรวจสอบและ Confirm รายการยาผู้ป่วย IPD แพทย์สั่ง Order ทั้งแบบ ONE DAY และ CONTINUE", "role": "พยาบาล Ward (NUH)", "critical": False, "steps": "1. เข้าเมนู ผู้ป่วยใน -> รายการเตียง -> เลือก Ward -> เปิดหน้า 'Patient IPD Summary'\n2. ตรวจสอบคอลัมน์ 'ORDER FOR ONE DAY' และ 'NEW ORDER FOR CONTINUE'\n3. ตรวจสอบชื่อยา/ขนาด/วิธีใช้ -> กดปุ่ม 'รับออเดอร์' ทุกรายการ", "criteria": "สถานะ Order เปลี่ยนเป็นรับออเดอร์แล้ว และรายการถูกส่งไปห้องยา IPD" },
    { "id": "SC-09", "flow": "IPD", "name": "NUH: เภสัชกรรมจ่ายยา IPD [ONE DAY] (สร้างใบยา) -> ชำระเงิน -> เภสัชกรรม จ่ายยา -> พยาบาล Ward", "desc": "เภสัชกรจ่ายยาผู้ป่วย IPD พร้อมกัน X ราย แยกตามประเภท Order ONE DAY และต้องชำระเงิน", "role": "เภสัชกร IPD / การเงิน / พยาบาล Ward (NUH)", "critical": False, "steps": "1. เภสัชกรเข้า tab 'Order รอยืนยัน' -> ตรวจสอบยา One Day -> กด 'สร้างใบยา' (พิมพ์ฉลาก auto) -> ยืนยันใบยา\n2. การเงินออกใบแจ้งหนี้ -> รับชำระเงิน\n3. เภสัชกรเห็นสถานะ 'ชำระเงินแล้ว' -> จัดยา -> กด 'จ่ายยา'", "criteria": "รายการยา One Day วิ่งไปแสดงบน e-MAR ของพยาบาล Ward พร้อมจ่ายยา" },
    { "id": "SC-10", "flow": "IPD", "name": "NUH: เภสัชกรรมจ่ายยา IPD [CONTINUE] (สร้างใบยา) -> เภสัชกรรม จ่ายยา -> พยาบาล Ward", "desc": "เภสัชกรจ่ายยาผู้ป่วย IPD พร้อมกัน X ราย แยกตามประเภท CONTINUE โดยไม่รอการชำระเงิน", "role": "เภสัชกร IPD / พยาบาล Ward (NUH)", "critical": False, "steps": "1. เภสัชกรเข้าเมนู 'รับ Continue Order ประจำวัน' -> เลือก Ward -> กด ค้นหา\n2. กดปุ่ม 'Generate ที่เลือก' -> ระบบสร้างใบยา Continue\n3. พิมพ์ฉลากยา -> กด 'จ่ายยา' (ไม่ต้องรอชำระเงิน)", "criteria": "รายการยา Continue ประจำวันถูก Generate และแสดงบน e-MAR ของ Ward ทันที" },
    { "id": "SC-11", "flow": "IPD", "name": "NUH: จนท. Lab check-in + ลงผล + แพทย์อ่านผล", "desc": "จนท. Lab ดำเนินการตรวจและบันทึกผลผู้ป่วย IPD ตามประเภท Order ONE DAY", "role": "จนท. Lab / แพทย์ IPD (NUH)", "critical": False, "steps": "1. จนท. Lab เข้า รายการแล็บ -> tab 'รอเช็คอิน' -> กด เช็คอิน -> เลือกประเภทตัวอย่าง -> กด เก็บแล้ว (Container) -> กด รับแล้ว\n2. ลงผล Lab -> บันทึกร่าง -> กด Final Report\n3. แพทย์เปิด Patient Profile IPD -> เมนู Lab result เพื่อดูผล", "criteria": "สถานะ Lab Task = 'เสร็จสิ้น' (Result completed) และแพทย์เห็นผลในระบบ" },
    { "id": "SC-12", "flow": "IPD", "name": "NUH: จนท. Xray check-in + ลงผล + แพทย์อ่านผล", "desc": "จนท. Xray ดำเนินการตรวจและบันทึกผลผู้ป่วย IPD พร้อมกัน X ราย แยกตามประเภท Order ONE DAY", "role": "จนท. X-ray / พยาบาล / แพทย์อ่านผล (NUH)", "critical": False, "steps": "1. จนท. X-ray ไป tab 'รอ Check-in' -> เช็คอิน -> กด 'เริ่มถ่ายภาพ' -> กด 'ถ่ายภาพแล้ว' -> เลือกแพทย์อ่านผล\n2. พยาบาลลงบันทึก Nurse Note / Imaging Nurse Note\n3. แพทย์ลงรายงานผลตรวจรังสี -> กด บันทึก", "criteria": "สถานะ Log = อ่านผล และรายงานผลรังสีแสดงใน EMR สมบูรณ์" },
    { "id": "SC-13", "flow": "IPD", "name": "NUH: การเงินเรียกเก็บระหว่างพักรักษา (Interim Billing)", "desc": "ญาติผู้ป่วยชำระค่ารักษาสะสมของผู้ป่วย IPD ทุก 3 วัน ตลอดช่วงพักรักษาในโรงพยาบาล NUH", "role": "การเงิน (Cashier IPD NUH)", "critical": False, "steps": "1. เข้าเมนู Cashier ค้นหาผู้ป่วย IPD -> ดูรายการค่าใช้จ่ายสะสม (ยา/Lab/X-ray/ค่าห้อง)\n2. ตรวจสอบสิทธิ -> เลือกรายการค่าใช้จ่าย -> กด 'สร้างใบแจ้งหนี้' (Interim Bill)\n3. เลือกสิทธิ/วิธีชำระ -> กด จ่าย + ยืนยัน", "criteria": "ระบบหักยอดชำระแล้วออกจากยอดค้างสะสม และตั้งรอบบันทึกใหม่สำหรับรอบถัดไป" },
    { "id": "SC-14", "flow": "IPD", "name": "NUH: Discharge Process (ปิดยอดครั้งสุดท้าย)", "desc": "แพทย์อนุมัติจำหน่ายผู้ป่วย IPD แล้วจนท.การเงินปิด Bill ยอดคงเหลือทั้งหมดและปลดเตียงคืนระบบ NUH", "role": "แพทย์ IPD / การเงิน IPD (NUH)", "critical": True, "steps": "1. แพทย์บันทึก Discharge Summary + ลงวินิจฉัยสุดท้าย + สั่งยากลับบ้าน -> กด ยืนยัน Discharge\n2. การเงินเปิดรายการ IPD รอปิด Bill -> ออกใบแจ้งหนี้ยอดสุดท้าย -> กด จ่าย + ยืนยัน -> ออกใบเสร็จ\n3. การเงินกดปุ่ม 'ปิด Admission'", "criteria": "รายชื่อผู้ป่วยย้ายไป tab 'ผู้ป่วยจำหน่าย' (Status = เสร็จสิ้น) และปลดเตียงคืนระบบสำเร็จ" },
    { "id": "SC-15", "flow": "OPD / IPD", "name": "NUH: จนท. จากทุกแผนกเข้าสั่งพิมพ์ report จากเมนู รายงาน", "desc": "เจ้าหน้าที่แต่ละแผนกละคน เข้ามาออกรายงานที่เมนูออกรายงาน NUH", "role": "จนท. ทุกแผนก (NUH)", "critical": False, "steps": "1. เข้าเมนู รายงาน (Report) -> เลือกประเภทรายงานตามแผนก NUH\n2. ทดสอบกด สั่งพิมพ์ (Print) สรุปยอด\n3. ทดสอบกด ดาวน์โหลด (Download) สรุปยอด", "criteria": "สั่งออกรายงานได้สำเร็จ ข้อมูลในไฟล์ PDF/Excel ถูกต้องครบถ้วน" },
    { "id": "SC-16", "flow": "OPD / IPD", "name": "NUH: จนท. Coder เข้าเมนู เบิกจ่าย เพื่อลงรหัสโรค", "desc": "เจ้าหน้าที่แผนก Coder เข้ามาลงรหัสโรคของผู้ป่วย NUH", "role": "จนท. Coder (NUH)", "critical": False, "steps": "1. เข้าเมนู เบิกจ่าย -> OPD/IPD -> รายการรอรหัสโรค -> เลือกผู้ป่วยสถานะ 'รอลงรหัส'\n2. ไปที่ Patient Profile -> เลือก Diagnosis + Procedure -> กด บันทึก\n3. กดปุ่ม '>' เพื่อลงรหัสคนถัดไป", "criteria": "สถานะผู้ป่วยเปลี่ยนเป็น 'ลงรหัสแล้ว' และย้ายไปแสดงใน tab ลงรหัสแล้ว" }
]

def make_site_scenarios(code, name_th):
    res = []
    for s in nuh_scenarios:
        item = dict(s)
        item['name'] = item['name'].replace('NUH:', f'{code}:')
        item['desc'] = item['desc'].replace('NUH-HIS', f'{code}-HIS').replace('NUH-EMR', f'{code}-EMR').replace('NUH', name_th)
        item['role'] = item['role'].replace('(NUH)', f'({code})')
        item['steps'] = item['steps'].replace('NUH-HIS', f'{code}-HIS').replace('NUH-EMR', f'{code}-EMR').replace('NUH', name_th)
        item['criteria'] = item['criteria'].replace('NUH', name_th)
        res.append(item)
    return res

# Save scenarios/nuh.json
with open('./scenarios/nuh.json', 'w', encoding='utf-8') as f:
    json.dump({"site": "NUH", "siteName": "NUH (โรงพยาบาลมหาวิทยาลัยนเรศวร)", "scenarios": nuh_scenarios}, f, ensure_ascii=False, indent=2)

# Save scenarios/sbh.json
sbh_scenarios = make_site_scenarios("SBH", "รพ.สระบุรี")
with open('./scenarios/sbh.json', 'w', encoding='utf-8') as f:
    json.dump({"site": "SBH", "siteName": "SBH (โรงพยาบาลสระบุรี)", "scenarios": sbh_scenarios}, f, ensure_ascii=False, indent=2)

# Save scenarios/tmh.json
tmh_scenarios = make_site_scenarios("TMH", "รพ.เวชศาสตร์เขตร้อน")
with open('./scenarios/tmh.json', 'w', encoding='utf-8') as f:
    json.dump({"site": "TMH", "siteName": "TMH (โรงพยาบาลเวชศาสตร์เขตร้อน)", "scenarios": tmh_scenarios}, f, ensure_ascii=False, indent=2)

# Save scenarios/siriraj.json
siriraj_scenarios = make_site_scenarios("Siriraj", "รพ.ศิริราช")
with open('./scenarios/siriraj.json', 'w', encoding='utf-8') as f:
    json.dump({"site": "Siriraj", "siteName": "Siriraj Hospital (รพ.ศิริราช)", "scenarios": siriraj_scenarios}, f, ensure_ascii=False, indent=2)

# Save scenarios/standard.json
std_scenarios = make_site_scenarios("Standard", "General Hospital")
with open('./scenarios/standard.json', 'w', encoding='utf-8') as f:
    json.dump({"site": "Standard", "siteName": "Standard (General Hospital)", "scenarios": std_scenarios}, f, ensure_ascii=False, indent=2)

print('Successfully created all JSON scenario files in ./scenarios/')
