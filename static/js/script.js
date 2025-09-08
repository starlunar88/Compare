document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('uploadForm');
    const pdfFileInput = document.getElementById('pdfFile');
    const excelFileInput = document.getElementById('excelFile');
    const pdfFileName = document.getElementById('pdfFileName');
    const excelFileName = document.getElementById('excelFileName');
    const comparisonLayout = document.getElementById('comparisonLayout');
    const pdfContent = document.getElementById('pdfContent');
    const excelContent = document.getElementById('excelContent');
    const diffContent = document.getElementById('diffContent');
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
        // 차이점 분석
        const differences = analyzeDifferences(result);
        
        // PDF 내용 표시 (왼쪽) - 강조 없이 원본 텍스트만
        if (result.pdf_text) {
            pdfContent.innerHTML = result.pdf_text;
        } else {
            pdfContent.innerHTML = '<p style="color: #666;">PDF 내용을 불러올 수 없습니다.</p>';
        }
        
        // 엑셀 내용 표시 (중간)
        console.log('전체 결과:', result);
        console.log('엑셀 데이터 존재 여부:', !!result.excel_data);
        console.log('엑셀 데이터:', result.excel_data);
        
        if (result.excel_data && !result.excel_data.error) {
            const excelText = extractExcelText(result.excel_data);
            console.log('추출된 엑셀 텍스트:', excelText);
            console.log('텍스트 길이:', excelText.length);
            
            if (excelText && excelText.trim()) {
                // 엑셀 내용도 강조 없이 원본 텍스트만 표시
                excelContent.innerHTML = excelText;
            } else {
                excelContent.innerHTML = '<p style="color: #666;">엑셀에서 텍스트를 추출할 수 없습니다.</p>';
            }
        } else {
            if (result.excel_data && result.excel_data.error) {
                excelContent.innerHTML = `<p style="color: #f44336;">엑셀 오류: ${result.excel_data.error}</p>`;
            } else {
                excelContent.innerHTML = '<p style="color: #666;">엑셀 데이터가 없습니다.</p>';
            }
        }
        
        // 비교 결과 표시 (오른쪽) - 문자 단위 차이점 강조
        if (result.pdf_text && result.excel_data && !result.excel_data.error) {
            const excelText = extractExcelText(result.excel_data);
            if (excelText && excelText.trim()) {
                const diffHtml = createCharacterLevelDiff(result.pdf_text, excelText);
                diffContent.innerHTML = diffHtml;
            } else {
                diffContent.innerHTML = '<div style="text-align: center; color: #666;">엑셀 데이터를 비교할 수 없습니다.</div>';
            }
        } else {
            diffContent.innerHTML = '<div style="text-align: center; color: #666;">비교할 데이터가 없습니다.</div>';
        }
        
        comparisonLayout.style.display = 'grid';
        comparisonLayout.scrollIntoView({ behavior: 'smooth' });
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
        pdfContent.innerHTML = '<p style="color: #f44336;">❌ 오류 발생</p>';
        excelContent.innerHTML = '<p style="color: #f44336;">❌ 오류 발생</p>';
        diffContent.innerHTML = `<div style="color: #f44336; text-align: center;"><h4>❌ 오류 발생</h4><p>${message}</p></div>`;
        comparisonLayout.style.display = 'grid';
        comparisonLayout.scrollIntoView({ behavior: 'smooth' });
    }

    function analyzeDifferences(result) {
        const differences = { pdfOnly: [], excelOnly: [] };
        
        if (result.differences) {
            result.differences.forEach(diff => {
                if (diff.type === 'only_in_pdf') {
                    differences.pdfOnly = diff.content || [];
                } else if (diff.type === 'only_in_excel') {
                    differences.excelOnly = diff.content || [];
                }
            });
        }
        
        return differences;
    }

    function extractExcelText(excelData) {
        let text = '';
        console.log('extractExcelText 입력 데이터:', excelData);
        
        Object.keys(excelData).forEach(sheetName => {
            console.log(`시트 '${sheetName}' 처리 중:`, excelData[sheetName]);
            
            if (Array.isArray(excelData[sheetName])) {
                excelData[sheetName].forEach((row, index) => {
                    console.log(`행 ${index}:`, row);
                    
                    if (typeof row === 'object' && row !== null) {
                        Object.values(row).forEach(value => {
                            if (value && value.toString().trim()) {
                                text += value.toString().trim() + ' ';
                                console.log(`추가된 값: "${value}"`);
                            }
                        });
                    }
                });
            }
        });
        
        console.log('최종 추출된 텍스트:', text.trim());
        return text.trim();
    }

    function highlightDifferences(text, diffWords) {
        if (!diffWords || diffWords.length === 0) {
            return text;
        }
        
        let highlightedText = text;
        diffWords.forEach(word => {
            if (word && word.toString().trim()) {
                const regex = new RegExp(`\\b${word.toString().trim()}\\b`, 'g');
                highlightedText = highlightedText.replace(regex, `<span class="diff-highlight">${word}</span>`);
            }
        });
        
        return highlightedText;
    }

    function createExcelPreviewWithHighlight(highlightedText) {
        const section = document.createElement('div');
        section.className = 'diff-item';
        section.style.background = '#f0fff0';
        section.style.borderColor = '#32cd32';
        
        section.innerHTML = `
            <h3>📊 엑셀 데이터 미리보기</h3>
            <div class="diff-content">${highlightedText}</div>
        `;
        
        return section;
    }

    function createCharacterLevelDiff(pdfText, excelText) {
        // 공백 제거하고 비교
        const pdfClean = pdfText.replace(/\s+/g, '');
        const excelClean = excelText.replace(/\s+/g, '');
        
        let diffHtml = '<div style="font-family: monospace; line-height: 1.8;">';
        diffHtml += '<h4 style="margin-bottom: 15px; color: #333;">🔍 문자 단위 차이점</h4>';
        
        // PDF와 Excel 텍스트를 나란히 표시
        diffHtml += '<div style="margin-bottom: 10px;">';
        diffHtml += '<strong>PDF:</strong> ';
        diffHtml += highlightCharacterDifferences(pdfClean, excelClean, 'pdf');
        diffHtml += '</div>';
        
        diffHtml += '<div style="margin-bottom: 15px;">';
        diffHtml += '<strong>Excel:</strong> ';
        diffHtml += highlightCharacterDifferences(excelClean, pdfClean, 'excel');
        diffHtml += '</div>';
        
        // 차이점 요약
        const differences = findCharacterDifferences(pdfClean, excelClean);
        if (differences.length > 0) {
            diffHtml += '<div style="margin-top: 15px; padding: 10px; background: #fff3e0; border-radius: 5px;">';
            diffHtml += '<strong>차이점 요약:</strong><br>';
            differences.forEach(diff => {
                diffHtml += `• ${diff}<br>`;
            });
            diffHtml += '</div>';
        } else {
            diffHtml += '<div style="text-align: center; color: #4caf50; font-weight: bold; margin-top: 15px;">✅ 차이점 없음</div>';
        }
        
        diffHtml += '</div>';
        return diffHtml;
    }

    function highlightCharacterDifferences(text1, text2, type) {
        let result = '';
        const maxLength = Math.max(text1.length, text2.length);
        
        for (let i = 0; i < maxLength; i++) {
            const char1 = text1[i] || '';
            const char2 = text2[i] || '';
            
            if (char1 !== char2) {
                // 다른 문자는 빨간색으로 강조
                result += `<span style="background-color: #ffebee; color: #d32f2f; font-weight: bold; padding: 2px 4px; border-radius: 3px; border: 1px solid #ffcdd2;">${char1}</span>`;
            } else {
                // 같은 문자는 검정색
                result += `<span style="color: #000;">${char1}</span>`;
            }
        }
        
        return result;
    }

    function findCharacterDifferences(text1, text2) {
        const differences = [];
        const maxLength = Math.max(text1.length, text2.length);
        
        for (let i = 0; i < maxLength; i++) {
            const char1 = text1[i] || '';
            const char2 = text2[i] || '';
            
            if (char1 !== char2) {
                if (char1 && char2) {
                    differences.push(`위치 ${i+1}: "${char1}" → "${char2}"`);
                } else if (char1) {
                    differences.push(`위치 ${i+1}: "${char1}" (PDF에만 있음)`);
                } else if (char2) {
                    differences.push(`위치 ${i+1}: "${char2}" (Excel에만 있음)`);
                }
            }
        }
        
        return differences;
    }
});