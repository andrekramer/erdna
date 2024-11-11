# Test script written using free to use ChatGPT

import re
import sys
import requests

# Check if any arguments were provided
if len(sys.argv) > 1:
    file_path = sys.argv[1]  # The first argument after the script name
    print(f"The file to test is: {file_path}")
else:
    print("No arguments were provided.")
    exit()

url = "http://localhost:8080"

def run_test(test, result):
    print("========================")
    print(result)
    print("????????????????????????")
    # print(test)
    test = test.replace("\\\"", "\"")
    test = test.replace("$bq", "`")
    
    response = requests.post(url, data=test.encode('utf-8'), headers={'Content-Type': 'text/plain;charset=utf-8'})
    print(response.text)
    if response.text.strip() == result.strip():
        print("PASS")
    else:
        print("FAIL")

def run_file(file_path):
    intest = False
    result = ""
    test = ""

    try:
        with open(file_path, 'r') as file:
            for line in file:
                # print("line: " + line)
                if line.startswith("curl --data \"") or line.startswith("curl --data-raw '") or line.startswith("export bq='`';curl --data "):
                    intest = True
                    if len(result.strip()) != 0:
                        run_test(test, result)
                       
                        test = ""
                        result = ""
                    continue
                if line.startswith("\" localhost:8080") or line.startswith("' localhost:8080"):
                    intest = False
                    print("------------------------")
                    print(test)
                    continue
                if intest:
                    test += line
                else:
                    result += line

            if len(result.strip()) != 0:
                run_test(test, result)

    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


run_file(file_path)
