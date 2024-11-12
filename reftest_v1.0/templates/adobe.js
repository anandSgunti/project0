
        let textChunks = '';

        // Adobe PDF Viewer integration
        document.getElementById("upload-btn").addEventListener("click", () => {
            document.getElementById("file-picker").click();
        });

        document.getElementById("file-picker").addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file && file.type === "application/pdf") {
                loadPDFInAdobeViewer(file);
                uploadPDFForChatbot(file);
            }
        });

        function loadPDFInAdobeViewer(file) {
            const reader = new FileReader();
            reader.onloadend = function (e) {
                const adobeDCView = new AdobeDC.View({
                    clientId: "edf9c606d17a43cf98d169ff057c87d5",
                    divId: "adobe-dc-view",
                });
                adobeDCView.previewFile({
                    content: { promise: Promise.resolve(e.target.result) },
                    metaData: { fileName: file.name }
                }, {});
            };
            reader.readAsArrayBuffer(file);
        }

        // Chatbot upload functionality from index1.html
        function uploadPDFForChatbot(file) {
            const formData = new FormData();
            formData.append('pdf_file', file);

            $.ajax({
                url: '/upload_pdf',
                type: 'POST',
                data: formData,
                contentType: false,
                processData: false,
                success: function (response) {
                    textChunks = response.text_chunks;
                    appendMessage('assistant', 'PDF processed and ready for questions.');
                    $('#question').prop('disabled', false);
                    $('#ask-btn').prop('disabled', false);
                },
                error: function () {
                    appendMessage('assistant', 'Error uploading the PDF.');
                }
            });
        }

        // Chatbot messaging functions
        function appendMessage(sender, message) {
           const chatBox = $('#chat-box');
           const avatar = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
           const highlightButton = sender === 'assistant' ? '<button class="highlight-btn">Navigate</button>' : '';
           const messageDiv = `
               <div class="${sender} message">
                   <div class="avatar">${avatar}</div>
                   <div class="message-content">${message}</div>
                   ${highlightButton}
               </div>`;
           chatBox.append(messageDiv);
           chatBox.scrollTop(chatBox[0].scrollHeight);

           if (sender === 'assistant') {
               $('.highlight-btn').last().on('click', function() {
                   $(this).siblings('.message-content').toggleClass('highlighted');
               });
           }
       }

        $('#ask-btn').on('click', function () {
            const question = $('#question').val();
            if (!question) return;
            appendMessage('user', question);
            askQuestion(question);
            $('#question').val('');
        });

        

        function askQuestion(question) {
            $.ajax({
                url: '/ask_question',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ text_chunks: textChunks, question }),
                success: function (response) {
                    appendMessage('assistant', response.answer);
                },
                error: function () {
                    appendMessage('assistant', 'Error getting the answer.');
                }
            });
        }
