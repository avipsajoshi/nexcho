import os
def get_uploads_path_os(): 
    current_file_abs_path = os.path.abspath(__file__)
    project_root = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(current_file_abs_path)))
    )
    # 3. Join with the target folder
    uploads_dir = os.path.join(project_root, 'uploads')
    return uploads_dir


