import re
with open('app/routes/model.py', 'r') as f:
    content = f.read()

preview_code = """
@router.post("/preview-dataset")
async def preview_dataset(file: UploadFile = File(...)):
    is_excel = file.filename.endswith((".xlsx", ".xls"))
    is_csv = file.filename.endswith(".csv")

    if not (is_excel or is_csv):
        raise HTTPException(status_code=400, detail="File harus berformat CSV atau Excel (.xlsx, .xls)")

    try:
        content = await file.read()
        df = None
        if is_excel or content.startswith(b"PK"):
            try:
                import io
                import pandas as pd
                df = pd.read_excel(io.BytesIO(content))
            except Exception:
                pass
                
        if df is None:
            encodings = ['utf-8', 'latin1', 'ISO-8859-1']
            for enc in encodings:
                try:
                    import io
                    import pandas as pd
                    df = pd.read_csv(io.BytesIO(content), encoding=enc, sep=None, engine='python', on_bad_lines='skip')
                    break
                except Exception:
                    continue
        
        if df is None:
            raise HTTPException(status_code=400, detail="Gagal membaca file.")

        df.columns = [str(c).strip().lower() for c in df.columns]
        
        if "label" not in df.columns:
            raise HTTPException(status_code=400, detail="Dataset harus memiliki kolom 'label'.")

        spam_count = 0
        ham_count = 0

        for _, row in df.iterrows():
            label = str(row["label"]).strip().lower()
            if label == "1": label = "spam"
            elif label == "0": label = "ham"
            
            if label == "spam":
                spam_count += 1
            elif label == "ham":
                ham_count += 1

        return {
            "status": "success",
            "metrics": {
                "total": spam_count + ham_count,
                "spam": spam_count,
                "ham": ham_count,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal preview: {str(e)}")
"""

if "/preview-dataset" not in content:
    content = content.replace('@router.post("/upload-dataset"', preview_code + '\n@router.post("/upload-dataset"')
    
    # Update upload_dataset to accept dataset_name
    content = content.replace('file: UploadFile = File(..., description="CSV file dengan kolom \'text\' dan \'label\'"),', 
                              'file: UploadFile = File(..., description="CSV file dengan kolom \'text\' dan \'label\'"),\n    dataset_name: Optional[str] = Form(None),')
    content = content.replace('name=file.filename,', 'name=dataset_name if dataset_name else file.filename,')

    with open('app/routes/model.py', 'w') as f:
        f.write(content)
    print("Backend modified")
