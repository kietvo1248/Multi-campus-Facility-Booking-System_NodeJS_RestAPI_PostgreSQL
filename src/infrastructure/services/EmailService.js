// services/EmailService.js
const nodemailer = require('nodemailer');

// 1. Cấu hình Transporter
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // Ví dụ: 'gmail'
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // App Password
    }
});

// Helper: Định dạng ngày giờ kiểu Việt Nam (dd/mm/yyyy)
const formatDateVN = (dateInput) => {
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return dateInput; // Nếu là chuỗi đã format thì trả về nguyên vẹn
        return d.toLocaleDateString('vi-VN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateInput;
    }
};

/**
 * Gửi email thông báo
 * @param {string} userEmail - Email người nhận
 * @param {object} bookingDetails - { roomName, date, startTime, endTime } 
 * @param {string} type - 'APPROVED', 'REJECTED', 'MAINTENANCE', 'RELOCATED'
 * @param {string} reason - Lý do (nếu có)
 */
const sendBookingNotification = async (userEmail, bookingDetails, type, reason = '') => {
    // 1. Validate Email
    if (!userEmail || !userEmail.includes('@')) {
        console.log('⚠️ Email Service: Bỏ qua vì email không hợp lệ:', userEmail);
        return; 
    }

    try {
        let subject = '';
        let bodyContent = '';
        
        // Destructuring & Format dữ liệu
        const { roomName, date, startTime, endTime } = bookingDetails;
        
        // Tạo chuỗi thời gian đẹp (VD: 07:00 - 09:00)
        let timeSlotStr = '';
        if (startTime && endTime) {
             const t1 = new Date(startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
             const t2 = new Date(endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
             timeSlotStr = `${t1} - ${t2}`;
        } else {
             timeSlotStr = bookingDetails.slot || 'N/A'; // Fallback nếu controller truyền chuỗi slot sẵn
        }

        const formattedDate = formatDateVN(date || startTime);

        // Template CSS chung (Inline CSS để hỗ trợ mọi mail client)
        const styleContainer = `font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;`;
        const styleHeader = `background-color: #f8f9fa; padding: 10px; text-align: center; border-bottom: 1px solid #eee; margin-bottom: 20px;`;
        const styleList = `background-color: #f1f3f5; padding: 15px; border-radius: 5px; list-style: none; margin: 0;`;
        const styleFooter = `margin-top: 20px; font-size: 12px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 10px;`;

        // 2. Logic nội dung theo Type
        switch (type) {
            case 'APPROVED':
                subject = '✅ [Booking] Đặt phòng thành công';
                bodyContent = `
                    <h2 style="color: #28a745;">Yêu cầu được chấp nhận</h2>
                    <p>Xin chào,</p>
                    <p>Yêu cầu đặt phòng của bạn đã được Admin phê duyệt. Vui lòng sử dụng đúng thời gian quy định.</p>
                `;
                break;

            case 'REJECTED':
                subject = '❌ [Booking] Yêu cầu bị từ chối';
                bodyContent = `
                    <h2 style="color: #dc3545;">Yêu cầu bị từ chối</h2>
                    <p>Xin chào,</p>
                    <p>Rất tiếc, yêu cầu đặt phòng của bạn không được chấp nhận.</p>
                    <p><strong>Lý do:</strong> ${reason}</p>
                `;
                break;

            case 'MAINTENANCE':
                subject = '⚠️ [Booking] Thông báo hủy lịch (Bảo trì/Conflict)';
                bodyContent = `
                    <h2 style="color: #ffc107;">Lịch đặt phòng bị hủy</h2>
                    <p>Xin chào,</p>
                    <p>Hệ thống buộc phải hủy lịch đặt phòng của bạn do kế hoạch bảo trì đột xuất hoặc xung đột sự kiện ưu tiên.</p>
                    <p><strong>Lý do:</strong> ${reason}</p>
                    <p>Vui lòng đặt lại phòng khác hoặc liên hệ Admin.</p>
                `;
                break;

            case 'RELOCATED': // [MỚI] Case này dùng cho hàm relocate
                subject = '🔄 [Booking] Thông báo thay đổi phòng';
                bodyContent = `
                    <h2 style="color: #17a2b8;">Thay đổi địa điểm</h2>
                    <p>Xin chào,</p>
                    <p>Lịch đặt của bạn đã được Admin <strong>chuyển sang phòng mới</strong>.</p>
                    <p><strong>Lý do thay đổi:</strong> ${reason}</p>
                    <p>Dưới đây là thông tin phòng mới:</p>
                `;
                break;

            default:
                return;
        }

        // 3. Ghép Template HTML hoàn chỉnh
        const html = `
            <div style="${styleContainer}">
                <div style="${styleHeader}">
                    <h1 style="margin:0; font-size: 20px;">Hệ thống Đặt phòng FPTU</h1>
                </div>
                
                ${bodyContent}
                
                <ul style="${styleList}">
                    <li><strong>Phòng:</strong> ${roomName}</li>
                    <li><strong>Ngày:</strong> ${formattedDate}</li>
                    <li><strong>Thời gian:</strong> ${timeSlotStr}</li>
                </ul>
                
                <div style="${styleFooter}">
                    <p>Đây là email tự động, vui lòng không trả lời.</p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"FPTU Booking System" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: subject,
            html: html
        };

        // Gửi mail
        await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${userEmail} | Type: ${type}`);

    } catch (error) {
        console.error('⚠️ Email Service Error:', error.message);
    }
};

module.exports = { sendBookingNotification };