document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('uploadForm');
    const pdfFileInput = document.getElementById('pdfFile');
    const excelFileInput = document.getElementById('excelFile');
    const pdfFileName = document.getElementById('pdfFileName');
    const excelFileName = document.getElementById('excelFileName');
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    const compareBtn = document.querySelector('.compare-btn');
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');

    // 파일 선택 시 파일명 표시
    pdfFileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            pdfFileName.textContent = this.files[0].name;
        } else {
            pdfFileName.textContent = '파일을 선택하세요';
        }
    });

    excelFileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            excelFileName.textContent = this.files[0].name;
        } else {
            excelFileName.textContent = '파일을 선택하세요';
        }
    });

    // 폼 제출 처리
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        
        // 로딩 상태 표시
        compareBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                displayResults(result);
            } else {
                showError(result.error);
            }
        } catch (error) {
            showError('서버와의 통신 중 오류가 발생했습니다: ' + error.message);
        } finally {
            // 로딩 상태 해제
            compareBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    });

    function displayResults(result) {
        resultsContent.innerHTML = '';
        
        // PDF 텍스트 미리보기
        if (result.pdf_text) {
            const pdfPreview = createPreviewSection('PDF 내용 미리보기', result.pdf_text);
            resultsContent.appendChild(pdfPreview);
        }
        
        // 엑셀 데이터 미리보기
        if (result.excel_data && !result.excel_data.error) {
            const excelPreview = createExcelPreview(result.excel_data);
            resultsContent.appendChild(excelPreview);
        }
        
        // 차이점 표시
        if (result.differences && result.differences.length > 0) {
            const differencesSection = document.createElement('div');
            differencesSection.innerHTML = '<h3>🔍 발견된 차이점</h3>';
            
            result.differences.forEach(diff => {
                const diffElement = createDifferenceElement(diff);
                differencesSection.appendChild(diffElement);
            });
            
            resultsContent.appendChild(differencesSection);
        } else {
            const noDiffElement = document.createElement('div');
            noDiffElement.className = 'diff-item';
            noDiffElement.style.background = '#e6ffe6';
            noDiffElement.style.borderColor = '#44ff44';
            noDiffElement.innerHTML = '<h3>✅ 차이점 없음</h3><p>PDF와 엑셀 파일의 내용이 일치합니다.</p>';
            resultsContent.appendChild(noDiffElement);
        }
        
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    function createPreviewSection(title, content) {
        const section = document.createElement('div');
        section.className = 'diff-item';
        section.style.background = '#f0f8ff';
        section.style.borderColor = '#4169e1';
        
        section.innerHTML = `
            <h3>${title}</h3>
            <div class="diff-content">${content}</div>
        `;
        
        return section;
    }

    function createExcelPreview(excelData) {
        const section = document.createElement('div');
        section.className = 'diff-item';
        section.style.background = '#f0fff0';
        section.style.borderColor = '#32cd32';
        
        let html = '<h3>📊 엑셀 데이터 미리보기</h3>';
        
        Object.keys(excelData).forEach(sheetName => {
            html += `<h4>시트: ${sheetName}</h4>`;
            html += '<div class="diff-content">';
            
            if (excelData[sheetName].length > 0) {
                // 첫 번째 행을 헤더로 사용
                const headers = Object.keys(excelData[sheetName][0]);
                html += headers.join('\t') + '\n';
                
                // 데이터 행들 (최대 10행만 표시)
                excelData[sheetName].slice(0, 10).forEach(row => {
                    html += headers.map(header => row[header] || '').join('\t') + '\n';
                });
                
                if (excelData[sheetName].length > 10) {
                    html += `... (총 ${excelData[sheetName].length}행 중 10행만 표시)`;
                }
            }
            
            html += '</div>';
        });
        
        section.innerHTML = html;
        return section;
    }

    function createDifferenceElement(diff) {
        const element = document.createElement('div');
        element.className = `diff-item ${diff.type}`;
        
        let title = '';
        let content = '';
        
        switch (diff.type) {
            case 'error':
                title = '❌ 오류';
                content = diff.message;
                break;
            case 'text_diff':
                title = '📝 텍스트 차이점';
                content = diff.content.join('\n');
                break;
            case 'only_in_pdf':
                title = '📄 PDF에만 있는 내용';
                content = createWordList(diff.content);
                break;
            case 'only_in_excel':
                title = '📊 엑셀에만 있는 내용';
                content = createWordList(diff.content);
                break;
        }
        
        element.innerHTML = `
            <h3>${title}</h3>
            <div class="diff-content">${content}</div>
        `;
        
        return element;
    }

    function createWordList(words) {
        if (Array.isArray(words)) {
            return `<div class="word-list">${words.map(word => `<span class="word-tag">${word}</span>`).join('')}</div>`;
        }
        return words;
    }

    function showError(message) {
        resultsContent.innerHTML = `
            <div class="diff-item error">
                <h3>❌ 오류 발생</h3>
                <p>${message}</p>
            </div>
        `;
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
});