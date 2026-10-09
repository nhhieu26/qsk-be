import type { z } from "zod";
import type { createProductSchema } from "../../modules/product/product.schema.js";

/** Dữ liệu thô trước khi parse qua `createProductSchema`. */
export type StandardProduct = z.input<typeof createProductSchema> & {
  claims: readonly string[];
};

/**
 * Danh mục 52 sản phẩm chuẩn, chuyển từ Firestore của bản Vercel
 * (collection `products`, đọc ngày 2026-10-08).
 * Lấy thông tin sản phẩm, tồn hiện tại, câu công dụng, mục lục, giá liên hệ.
 * Chưa chuyển: giấy tờ (tệp lưu trong Firestore), lịch sử thẻ kho, giá nhập (đều 0).
 */
export const STANDARD_PRODUCTS: readonly StandardProduct[] = [
  {
    "name": "Cẩm nang Magie",
    "customerGroup": "Cả ba nhóm",
    "price": 0,
    "initialStock": 18,
    "threshold": 10,
    "menuGroup": "Cẩm nang và tài liệu",
    "priceOnRequest": true,
    "claims": []
  },
  {
    "name": "Cẩm nang phát triển chiều cao 002 (Catalogue 48 trang)",
    "customerGroup": "Cả ba nhóm",
    "price": 0,
    "initialStock": 21,
    "threshold": 10,
    "menuGroup": "Cẩm nang và tài liệu",
    "priceOnRequest": true,
    "claims": []
  },
  {
    "name": "Cẩm nang Sức khoẻ xương",
    "customerGroup": "Cả ba nhóm",
    "price": 0,
    "initialStock": 18,
    "threshold": 10,
    "menuGroup": "Cẩm nang và tài liệu",
    "priceOnRequest": true,
    "claims": []
  },
  {
    "name": "Bộ chạm nhảy tăng chiều cao Midu MIGI",
    "customerGroup": "Trẻ em",
    "category": "equipment",
    "price": 120000,
    "initialStock": 1,
    "threshold": 10,
    "menuGroup": "Dụng cụ và thiết bị",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Bộ dây nhảy túi DN22",
    "customerGroup": "Trẻ em",
    "category": "equipment",
    "price": 139000,
    "initialStock": 9,
    "threshold": 10,
    "menuGroup": "Dụng cụ và thiết bị",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Cân chuyên gia Midu (cân 16 chỉ số)",
    "customerGroup": "Cả ba nhóm",
    "price": 999000,
    "initialStock": 0,
    "threshold": 10,
    "menuGroup": "Dụng cụ và thiết bị",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Cân dự đoán chiều cao",
    "customerGroup": "Trẻ em",
    "price": 0,
    "initialStock": 0,
    "threshold": 10,
    "menuGroup": "Dụng cụ và thiết bị",
    "priceOnRequest": true,
    "claims": []
  },
  {
    "name": "Hộp dây nhảy tăng chiều cao MIDU DN38",
    "customerGroup": "Trẻ em",
    "category": "equipment",
    "price": 199000,
    "initialStock": 11,
    "threshold": 10,
    "menuGroup": "Dụng cụ và thiết bị",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Máy nhảy dây Midu",
    "customerGroup": "Trẻ em",
    "category": "equipment",
    "price": 390000,
    "initialStock": 3,
    "threshold": 10,
    "menuGroup": "Dụng cụ và thiết bị",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Thước đo chiều cao Midu Higher",
    "customerGroup": "Trẻ em",
    "category": "equipment",
    "price": 180000,
    "initialStock": 1,
    "threshold": 10,
    "menuGroup": "Dụng cụ và thiết bị",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Hộp Chuyên Gia Nhí, bé gái (12-16kg) 2 tuổi",
    "customerGroup": "Trẻ em",
    "price": 269000,
    "initialStock": 10,
    "threshold": 10,
    "menuGroup": "Hộp Chuyên Gia Nhí",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Hộp Chuyên Gia Nhí, bé gái (17-21kg) 3 tuổi",
    "customerGroup": "Trẻ em",
    "price": 269000,
    "initialStock": 10,
    "threshold": 10,
    "menuGroup": "Hộp Chuyên Gia Nhí",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Hộp Chuyên Gia Nhí, bé gái (20-25kg) 4 tuổi",
    "customerGroup": "Trẻ em",
    "price": 269000,
    "initialStock": 11,
    "threshold": 10,
    "menuGroup": "Hộp Chuyên Gia Nhí",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Hộp Chuyên Gia Nhí, bé gái (25-30kg) 5 tuổi",
    "customerGroup": "Trẻ em",
    "price": 269000,
    "initialStock": 10,
    "threshold": 10,
    "menuGroup": "Hộp Chuyên Gia Nhí",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Hộp Chuyên Gia Nhí, bé trai (12-16kg) 2 tuổi",
    "customerGroup": "Trẻ em",
    "price": 269000,
    "initialStock": 10,
    "threshold": 10,
    "menuGroup": "Hộp Chuyên Gia Nhí",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Hộp Chuyên Gia Nhí, bé trai (17-21kg) 3 tuổi",
    "customerGroup": "Trẻ em",
    "price": 269000,
    "initialStock": 10,
    "threshold": 10,
    "menuGroup": "Hộp Chuyên Gia Nhí",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Hộp Chuyên Gia Nhí, bé trai (20-25kg) 4 tuổi",
    "customerGroup": "Trẻ em",
    "price": 269000,
    "initialStock": 10,
    "threshold": 10,
    "menuGroup": "Hộp Chuyên Gia Nhí",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Hộp Chuyên Gia Nhí, bé trai (25-30kg) 5 tuổi",
    "customerGroup": "Trẻ em",
    "price": 269000,
    "initialStock": 11,
    "threshold": 10,
    "menuGroup": "Hộp Chuyên Gia Nhí",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Hộp Chuyên Gia Nhí, thiếu niên (30-35kg) size XS",
    "customerGroup": "Trẻ em",
    "price": 299000,
    "initialStock": 11,
    "threshold": 10,
    "menuGroup": "Hộp Chuyên Gia Nhí",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Hộp Chuyên Gia Nhí, thiếu niên (35-45kg) size S",
    "customerGroup": "Trẻ em",
    "price": 299000,
    "initialStock": 10,
    "threshold": 10,
    "menuGroup": "Hộp Chuyên Gia Nhí",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Hộp Chuyên Gia Nhí, thiếu niên (45-55kg) size M",
    "customerGroup": "Trẻ em",
    "price": 299000,
    "initialStock": 10,
    "threshold": 10,
    "menuGroup": "Hộp Chuyên Gia Nhí",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Dung dịch vệ sinh Pigina 150ml",
    "customerGroup": "Phụ nữ",
    "price": 339000,
    "initialStock": 6,
    "threshold": 10,
    "menuGroup": "Midu MenaQ7 và chăm sóc",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Mena Q7 K2 45mcg, hộp (1 lọ x 100ml)",
    "customerGroup": "Trẻ em",
    "category": "supplement",
    "price": 150000,
    "initialStock": 6,
    "threshold": 10,
    "registrationNo": "3244/2018/ĐKSP",
    "shelfLife": "36 tháng",
    "menuGroup": "Midu MenaQ7 và chăm sóc",
    "priceOnRequest": false,
    "claims": [
      "Giúp bổ sung K2, Calci, D3 hỗ trợ tăng cường hấp thu Calci vào xương, nhờ đó giúp xương và răng chắc khỏe."
    ]
  },
  {
    "name": "MiduMenaQ7 180mcg, hộp (6 vỉ x 5 ống)",
    "customerGroup": "Cả ba nhóm",
    "category": "supplement",
    "price": 420000,
    "initialStock": 26,
    "threshold": 10,
    "registrationNo": "10856/2020/ĐKSP",
    "shelfLife": "36 tháng",
    "menuGroup": "Midu MenaQ7 và chăm sóc",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung calci, menaQ7 (vitamin K2 - MK-7), vitamin D3 cho cơ thể, hỗ trợ xương răng chắc khỏe, giảm nguy cơ thiếu hụt calci cho trẻ em và người cao tuổi, phụ nữ có thai."
    ]
  },
  {
    "name": "MiduMenaQ7 360 Care, hộp (1 lọ x 60 viên)",
    "customerGroup": "Người cao tuổi",
    "category": "supplement",
    "price": 860000,
    "initialStock": 12,
    "threshold": 10,
    "registrationNo": "142/2021/ĐKSP",
    "shelfLife": "36 tháng",
    "menuGroup": "Midu MenaQ7 và chăm sóc",
    "priceOnRequest": false,
    "claims": [
      "Hỗ trợ giảm mỡ máu, giảm nguy cơ hình thành cục máu đông, xơ vữa mạch máu.",
      "Hỗ trợ cải thiện các triệu chứng sau tai biến mạch máu não do tắc mạch."
    ]
  },
  {
    "name": "TPBS Midu Magie Citizen",
    "customerGroup": "Cả ba nhóm",
    "category": "fortifiedFood",
    "price": 225000,
    "initialStock": 22,
    "threshold": 10,
    "registrationNo": "01/TRUONGTHO/2026/TPBS (tự công bố)",
    "shelfLife": "36 tháng",
    "menuGroup": "Midu MenaQ7 và chăm sóc",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung Magie và Vitamin B6."
    ]
  },
  {
    "name": "Vitatree Premium D3K2 MK7 plus DHA Spray",
    "customerGroup": "Trẻ em",
    "category": "supplement",
    "price": 345000,
    "initialStock": 10,
    "threshold": 10,
    "registrationNo": "6141/2024/ĐKSP",
    "shelfLife": "36 tháng",
    "menuGroup": "Midu MenaQ7 và chăm sóc",
    "priceOnRequest": false,
    "claims": [
      "Hỗ trợ não, xương, răng."
    ]
  },
  {
    "name": "Nước Langbiang size lớn",
    "customerGroup": "Cả ba nhóm",
    "price": 15000,
    "initialStock": 23,
    "threshold": 24,
    "menuGroup": "Nước uống",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Nước Langbiang size nhỏ",
    "customerGroup": "Cả ba nhóm",
    "price": 8000,
    "initialStock": 23,
    "threshold": 24,
    "menuGroup": "Nước uống",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Argol Carmelite Essence (50ml)",
    "customerGroup": "Cả ba nhóm",
    "category": "medicalDevice",
    "price": 450000,
    "initialStock": 10,
    "threshold": 10,
    "registrationNo": "220002679/PCBB-HN (TTBYT loại B)",
    "menuGroup": "Sản phẩm mới",
    "priceOnRequest": false,
    "claims": [
      "Chữa viêm đường hô hấp trên mãn tính, viêm thanh quản, viêm họng, viêm amiđan, ho, khàn giọng, rát họng: dạng lọ xịt hoặc máy xông, tức xịt hoặc súc miệng.",
      "Chữa viêm mũi, viêm niêm mạc, chảy nước mũi, viêm xoang: dạng máy xông, lọ xịt hoặc súc miệng.",
      "Chữa cảm cúm hoặc bệnh lây nhiễm bên ngoài bằng cách sử dụng ngoài da cho trẻ em trên 3 tuổi: dùng gạc hoặc tấm xoa bóp, hoặc pha loãng giọt dung dịch trong nước tắm.",
      "Chữa cảm cúm hoặc bệnh lây nhiễm bên ngoài bằng cách sử dụng ngoài da cho phụ nữ mang thai: dùng gạc hoặc tấm xoa bóp."
    ]
  },
  {
    "name": "Argol Carmelite Essence (8ml)",
    "customerGroup": "Cả ba nhóm",
    "category": "medicalDevice",
    "price": 230000,
    "initialStock": 16,
    "threshold": 10,
    "registrationNo": "220002679/PCBB-HN (TTBYT loại B)",
    "menuGroup": "Sản phẩm mới",
    "priceOnRequest": false,
    "claims": [
      "Chữa viêm đường hô hấp trên mãn tính, viêm thanh quản, viêm họng, viêm amiđan, ho, khàn giọng, rát họng: dạng lọ xịt hoặc máy xông, tức xịt hoặc súc miệng.",
      "Chữa viêm mũi, viêm niêm mạc, chảy nước mũi, viêm xoang: dạng máy xông, lọ xịt hoặc súc miệng.",
      "Chữa cảm cúm hoặc bệnh lây nhiễm bên ngoài bằng cách sử dụng ngoài da cho trẻ em trên 3 tuổi: dùng gạc hoặc tấm xoa bóp, hoặc pha loãng giọt dung dịch trong nước tắm.",
      "Chữa cảm cúm hoặc bệnh lây nhiễm bên ngoài bằng cách sử dụng ngoài da cho phụ nữ mang thai: dùng gạc hoặc tấm xoa bóp."
    ]
  },
  {
    "name": "Bình xông Argol và túi vải",
    "customerGroup": "Cả ba nhóm",
    "price": 80000,
    "initialStock": 17,
    "threshold": 10,
    "menuGroup": "Sản phẩm mới",
    "priceOnRequest": false,
    "claims": []
  },
  {
    "name": "Thực phẩm BVSK Emmats 60V",
    "customerGroup": "Phụ nữ",
    "category": "supplement",
    "price": 495000,
    "initialStock": 0,
    "threshold": 10,
    "registrationNo": "2780/2021/ĐKSP",
    "shelfLife": "36 tháng",
    "menuGroup": "Sản phẩm mới",
    "priceOnRequest": false,
    "claims": [
      "Hỗ trợ giảm các nguy cơ lão hóa da như sạm nám, nhăn da.",
      "Hỗ trợ tăng cường sức khỏe phụ nữ.",
      "Hỗ trợ cải thiện tình trạng mệt mỏi, mất ngủ, bốc hỏa do suy giảm sinh lý nữ."
    ]
  },
  {
    "name": "Thực phẩm BVSK OPTIWAY 30V",
    "customerGroup": "Người cao tuổi",
    "category": "supplement",
    "price": 360000,
    "initialStock": 0,
    "threshold": 10,
    "registrationNo": "1495/2020/ĐKSP",
    "menuGroup": "Sản phẩm mới",
    "priceOnRequest": false,
    "claims": [
      "Hỗ trợ cải thiện thị lực, giúp giảm nhức mỏi mắt, khô mắt.",
      "Bổ sung chất chống oxy hóa, hạn chế quá trình lão hóa mắt."
    ]
  },
  {
    "name": "TPBS Yeast-Based Protein Chocolate Chuối 415g",
    "customerGroup": "Cả ba nhóm",
    "category": "fortifiedFood",
    "price": 875000,
    "initialStock": 0,
    "threshold": 10,
    "registrationNo": "09/CBLHSP-YERA (tự công bố)",
    "shelfLife": "30 tháng",
    "menuGroup": "Sản phẩm mới",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung đạm từ men vi sinh, beta-glucan và chất xơ hòa tan."
    ]
  },
  {
    "name": "TPBS Yeast-Based Protein hương Chocolate Chuối 66g",
    "customerGroup": "Cả ba nhóm",
    "category": "fortifiedFood",
    "price": 145000,
    "initialStock": 0,
    "threshold": 10,
    "registrationNo": "09/CBLHSP-YERA (tự công bố)",
    "shelfLife": "30 tháng",
    "menuGroup": "Sản phẩm mới",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung đạm từ men vi sinh, beta-glucan và chất xơ hòa tan."
    ]
  },
  {
    "name": "TPBS Yeast-Based Protein hương Vanilla 66g",
    "customerGroup": "Cả ba nhóm",
    "category": "fortifiedFood",
    "price": 145000,
    "initialStock": 0,
    "threshold": 10,
    "registrationNo": "08/CBLHSP-YERA (tự công bố)",
    "shelfLife": "30 tháng",
    "menuGroup": "Sản phẩm mới",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung đạm từ men vi sinh, beta-glucan và chất xơ hòa tan."
    ]
  },
  {
    "name": "TPBS Yeast-Based Protein Vanilla 415g",
    "customerGroup": "Cả ba nhóm",
    "category": "fortifiedFood",
    "price": 875000,
    "initialStock": 0,
    "threshold": 10,
    "registrationNo": "08/CBLHSP-YERA (tự công bố)",
    "shelfLife": "30 tháng",
    "menuGroup": "Sản phẩm mới",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung đạm từ men vi sinh, beta-glucan và chất xơ hòa tan."
    ]
  },
  {
    "name": "Y'era Pro hương Vanilla",
    "customerGroup": "Cả ba nhóm",
    "category": "fortifiedFood",
    "price": 900000,
    "initialStock": 20,
    "threshold": 10,
    "registrationNo": "04/CBLHSP-YERA (tự công bố)",
    "shelfLife": "30 tháng",
    "menuGroup": "Sản phẩm mới",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung đạm từ men vi sinh, beta-glucan và chất xơ hòa tan."
    ]
  },
  {
    "name": "Yera Standard hương Chocolate Chuối",
    "customerGroup": "Cả ba nhóm",
    "category": "fortifiedFood",
    "price": 693000,
    "initialStock": 20,
    "threshold": 10,
    "registrationNo": "02/CBLHSP-YERA (tự công bố)",
    "shelfLife": "30 tháng",
    "menuGroup": "Sản phẩm mới",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung đạm từ men vi sinh, beta-glucan và chất xơ hòa tan."
    ]
  },
  {
    "name": "Yera Standard hương Vanilla",
    "customerGroup": "Cả ba nhóm",
    "category": "fortifiedFood",
    "price": 693000,
    "initialStock": 20,
    "threshold": 10,
    "registrationNo": "01/CBLHSP-YERA (tự công bố)",
    "shelfLife": "30 tháng",
    "menuGroup": "Sản phẩm mới",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung đạm từ men vi sinh, beta-glucan và chất xơ hòa tan."
    ]
  },
  {
    "name": "Sản phẩm dinh dưỡng Naruto Kao IQ 850g",
    "customerGroup": "Trẻ em",
    "category": "infantNutrition",
    "price": 505000,
    "initialStock": 24,
    "threshold": 10,
    "registrationNo": "260/2021/ĐKSP",
    "shelfLife": "24 tháng",
    "menuGroup": "TPBS và dinh dưỡng",
    "priceOnRequest": false,
    "claims": [
      "Sản phẩm dùng để bổ sung cho chế độ ăn hàng ngày, giúp tăng cường miễn dịch, phát triển chiều cao và trí não."
    ]
  },
  {
    "name": "Thực phẩm BVSK Akamama Canxi (120 viên/hộp)",
    "customerGroup": "Trẻ em",
    "category": "supplement",
    "price": 380000,
    "initialStock": 40,
    "threshold": 10,
    "registrationNo": "3475/2024/ĐKSP",
    "menuGroup": "TPBS và dinh dưỡng",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung Canxi, Magie, Vitamin D3, Vitamin K2 cho cơ thể."
    ]
  },
  {
    "name": "Thực phẩm BVSK Akamama DHA EPA (90 viên/hộp)",
    "customerGroup": "Trẻ em",
    "category": "supplement",
    "price": 380000,
    "initialStock": 15,
    "threshold": 10,
    "registrationNo": "6169/2022/ĐKSP",
    "menuGroup": "TPBS và dinh dưỡng",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung Omega 3 chứa DHA và EPA cho phụ nữ trong các giai đoạn chuẩn bị mang thai, đang mang thai và cho con bú."
    ]
  },
  {
    "name": "Thực phẩm BVSK Akamama Vitamin Mineral (120 viên/hộp)",
    "customerGroup": "Trẻ em",
    "category": "supplement",
    "price": 380000,
    "initialStock": 18,
    "threshold": 10,
    "registrationNo": "6168/2022/ĐKSP",
    "menuGroup": "TPBS và dinh dưỡng",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung 11 loại vitamin và 9 loại khoáng chất cùng lợi khuẩn giúp hỗ trợ tăng cường sức khỏe cho phụ nữ trong giai đoạn chuẩn bị mang thai, đang mang thai và cho con bú."
    ]
  },
  {
    "name": "TPBS Ion Drink ZinC, hương quýt, Nhật Bản (hộp 22 gói)",
    "customerGroup": "Cả ba nhóm",
    "category": "fortifiedFood",
    "price": 220000,
    "initialStock": 5,
    "threshold": 10,
    "registrationNo": "Tự công bố ngày 12/05/2025 (Fine Việt Nam)",
    "shelfLife": "25 tháng",
    "menuGroup": "TPBS và dinh dưỡng",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung nước, dinh dưỡng, kẽm và axit citric cho cơ thể."
    ]
  },
  {
    "name": "TPBS Ion Drink, hương sữa chua, Nhật Bản (hộp 20 gói)",
    "customerGroup": "Cả ba nhóm",
    "category": "fortifiedFood",
    "price": 220000,
    "initialStock": 35,
    "threshold": 10,
    "registrationNo": "05/0900724502/FINEVN/2025 (tự công bố)",
    "shelfLife": "25 tháng",
    "menuGroup": "TPBS và dinh dưỡng",
    "priceOnRequest": false,
    "claims": [
      "Bổ sung nước, dinh dưỡng, vitamin C, ngoài ra còn bổ sung 10 tỷ lợi khuẩn Lactobacillus paracasei MCC1849 đã tiệt trùng, axit citric cho cơ thể."
    ]
  },
  {
    "name": "Cao trà mục nhan (hộp 6 ấm) (Hộp)",
    "customerGroup": "Cả ba nhóm",
    "price": 0,
    "initialStock": 13,
    "threshold": 5,
    "menuGroup": "Trà và sản phẩm khác",
    "priceOnRequest": true,
    "claims": []
  },
  {
    "name": "Cao trà mục nhan (vỏ đen nhỏ) (Hộp)",
    "customerGroup": "Cả ba nhóm",
    "price": 0,
    "initialStock": 3,
    "threshold": 5,
    "menuGroup": "Trà và sản phẩm khác",
    "priceOnRequest": true,
    "claims": []
  },
  {
    "name": "Cao trà mục nhan (vỏ đỏ nhỏ) (Hộp)",
    "customerGroup": "Cả ba nhóm",
    "price": 0,
    "initialStock": 23,
    "threshold": 5,
    "menuGroup": "Trà và sản phẩm khác",
    "priceOnRequest": true,
    "claims": []
  },
  {
    "name": "Cao trà mục nhan loại 50gr (Hộp)",
    "customerGroup": "Cả ba nhóm",
    "price": 0,
    "initialStock": 4,
    "threshold": 5,
    "menuGroup": "Trà và sản phẩm khác",
    "priceOnRequest": true,
    "claims": []
  },
  {
    "name": "Cao trà tắm (Gói)",
    "customerGroup": "Cả ba nhóm",
    "price": 0,
    "initialStock": 15,
    "threshold": 5,
    "menuGroup": "Trà và sản phẩm khác",
    "priceOnRequest": true,
    "claims": []
  }
];
