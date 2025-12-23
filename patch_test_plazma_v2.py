import os

target_file = "/Users/ADMIN/test-plazma/dist/admin/web.js"

with open(target_file, "r") as f:
    content = f.read()

modal_html = """
        <!-- Add Review Modal -->
        <div id="addReviewModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); align-items: center; justify-content: center; z-index: 1000;">
          <div style="background: white; padding: 30px; border-radius: 12px; width: 90%; max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h3 style="margin: 0;">Новый отзыв</h3>
              <button type="button" onclick="document.getElementById('addReviewModal').style.display='none'" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <form action="/admin/reviews/add" method="POST" enctype="multipart/form-data">
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Имя</label>
                <input type="text" name="name" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;" placeholder="Имя клиента">
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Текст отзыва</label>
                <textarea name="content" required rows="4" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;" placeholder="Текст отзыва..."></textarea>
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Ссылка (опционально)</label>
                <input type="text" name="link" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;" placeholder="Ссылка на профиль или пост">
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Фото (опционально)</label>
                <input type="file" name="image" accept="image/*" style="width: 100%;">
              </div>
              <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="checkbox" name="isPinned"> Закрепить отзыв
                </label>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" onclick="document.getElementById('addReviewModal').style.display='none'" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Отмена</button>
                <button type="submit" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Добавить</button>
              </div>
            </form>
          </div>
        </div>
"""

# Unique string identifying the end of the Reviews handler
search_str = """        html += `
        </div>
      </body>
      </html>
    `;
        res.send(html);
    }
    catch (error) {
        console.error('Reviews page error:', error);"""

replacement_str = """        html += `
        </div>
""" + modal_html + """
      </body>
      </html>
    `;
        res.send(html);
    }
    catch (error) {
        console.error('Reviews page error:', error);"""

if "Add Review Modal" not in content.split("router.get('/reviews'")[1].split("router.get('/orders'")[0]:
    # Only replace if not already present in the reviews section
    if search_str in content:
        content = content.replace(search_str, replacement_str)
        print("Patched reviews handler with modal.")
    else:
        print("Could not find search string in file. Content might differ.")
else:
    print("Modal already present in reviews handler.")

with open(target_file, "w") as f:
    f.write(content)
