const asyncHandler = require('express-async-handler');
const Submission = require('../models/submissionModel'); // Modelni import qilamiz

// Vazifa: POST /api/submissions
const createSubmission = asyncHandler(async (req, res) => {
    // protect middleware'dan kelgan userId
    const userId = req.user.id; 
    const { lessonId, submissionText } = req.body;
    
    if (!lessonId || !submissionText) {
        res.status(400);
        throw new Error("Dars IDsi va topshiriq matni kiritilishi shart.");
    }

    // Yangi topshiriqni yaratish
    const submission = await Submission.create({
        user: userId,
        lesson: lessonId,
        submissionText: submissionText,
        status: 'submitted' // Dastlabki status
    });

    res.status(201).json({
        success: true,
        message: 'Vazifa muvaffaqiyatli topshirildi.',
        submission: submission
    });
});

module.exports = {
    createSubmission
};