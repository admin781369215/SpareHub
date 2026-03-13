export const CAR_MAKES = [
  'تويوتا', 'هوندا', 'نيسان', 'فورد', 'شيفروليه', 
  'هيونداي', 'كيا', 'بي إم دبليو', 'مرسيدس', 'أودي'
];

export const CAR_LOGOS: Record<string, string> = {
  'تويوتا': 'https://logo.clearbit.com/toyota.com',
  'هوندا': 'https://logo.clearbit.com/honda.com',
  'نيسان': 'https://logo.clearbit.com/nissanusa.com',
  'فورد': 'https://logo.clearbit.com/ford.com',
  'شيفروليه': 'https://logo.clearbit.com/chevrolet.com',
  'هيونداي': 'https://logo.clearbit.com/hyundai.com',
  'كيا': 'https://logo.clearbit.com/kia.com',
  'بي إم دبليو': 'https://logo.clearbit.com/bmw.com',
  'مرسيدس': 'https://logo.clearbit.com/mercedes-benz.com',
  'أودي': 'https://logo.clearbit.com/audi.com'
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
