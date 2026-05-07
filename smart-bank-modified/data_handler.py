
import pandas as pd
import os

def load_csv(filename):
    path = os.path.join('data', filename)
    if not os.path.exists(path):
        return pd.DataFrame()
    return pd.read_csv(path)

def save_csv(filename, df):
    path = os.path.join('data', filename)
    df.to_csv(path, index=False)
