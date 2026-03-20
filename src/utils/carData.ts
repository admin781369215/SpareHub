export const CAR_MAKES = [
  'تويوتا', 'هوندا', 'نيسان', 'فورد', 'شيفروليه', 
  'هيونداي', 'كيا', 'بي إم دبليو', 'مرسيدس', 'أودي'
];

export const CAR_LOGOS: Record<string, string> = {
  'تويوتا': 'https://icon.horse/icon/toyota.com',
  'هوندا': 'https://icon.horse/icon/honda.com',
  'نيسان': 'https://icon.horse/icon/nissan-global.com',
  'فورد': 'https://icon.horse/icon/ford.com',
  'شيفروليه': 'https://icon.horse/icon/chevrolet.com',
  'هيونداي': 'https://icon.horse/icon/hyundai.com',
  'كيا': 'https://icon.horse/icon/kia.com',
  'بي إم دبليو': 'https://icon.horse/icon/bmw.com',
  'مرسيدس': 'https://icon.horse/icon/mercedes-benz.com',
  'أودي': 'https://icon.horse/icon/audi.com'
};

export const CAR_MODELS: Record<string, string[]> = {
  'تويوتا': ['كامري', 'كورولا', 'لاند كروزر', 'هايلكس', 'يارس'],
  'هوندا': ['سيفيك', 'أكورد', 'سي آر في', 'بايلوت'],
  'نيسان': ['ألتيما', 'باترول', 'صني', 'ماكسيما'],
  'فورد': ['موستانج', 'إف-150', 'إكسبلورر', 'تورس'],
  'شيفروليه': ['تاهو', 'سيلفرادو', 'ماليبو', 'كامارو'],
  'هيونداي': ['إلنترا', 'سوناتا', 'توسان', 'سنتافي'],
  'كيا': ['أوبتيما', 'سبورتاج', 'سورينتو', 'سيراتو'],
  'بي إم دبليو': ['الفئة الثالثة', 'الفئة الخامسة', 'X5', 'X6'],
  'مرسيدس': ['الفئة C', 'الفئة E', 'الفئة S', 'GLE'],
  'أودي': ['A4', 'A6', 'Q5', 'Q7']
};

export const getYears = () => {
  const currentYear = new Date().getFullYear() + 1;
  const years = [];
  for (let i = currentYear; i >= 1990; i--) {
    years.push(i.toString());
  }
  return years;
};
