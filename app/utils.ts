"use client";

export const updateLessonHistory = (widgetId, totalMarks, obtainedMarks, quizType) => window?.ReactNativeWebView?.postMessage(`__js
const userId = store.getState().userReducer.user?._id;
const { selectedLesson, quizStartTime } = store.getState().lessonReducer;
const timeSpentMs = Date.now() - quizStartTime;

store.dispatch({
  type: "history/addQuestion",
  payload: { isCorrect: ${obtainedMarks >= totalMarks / 2} }
});

store.dispatch(lessonApi.endpoints.updateLessonHistory.initiate({
  userId,
  lessonId: selectedLesson,
  body: {
    widgetData: {
      widgetID: '${widgetId}',
      isReattempt: false,
      widgetType: 'multipleChoice',
      timeSpentMs,
      mcqWidgetContent: {
        status: '${obtainedMarks >= totalMarks / 2 ? 'pass' : 'fail'}',
        title: '',
        totalMarks: ${totalMarks},
        passingMarks: ${totalMarks / 2},
        obtainedMarks: ${obtainedMarks},
        level: 'beginner',
        timeSpent: (timeSpentMs / 1000).toFixed(2),
        quizType: '${quizType}',
        attemptedQuestions: [],
      },
    },
  },
}))
`);
