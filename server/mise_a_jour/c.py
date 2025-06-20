import mysql.connector
from mysql.connector import Error

def get_chercheur_lmcs_names():
    """
    Retrieve all chercheur IDs and full names from the chercheur_lmcs table.
    Returns a list of tuples containing (chercheur_id, nom_complet).
    """
    # Database connection parameters
    db_config = {
        'host': 'localhost',
        'user': 'root',
        'password': 'isaac',  # Use your actual password here
        'database': 'lmcs'
    }
    
    connection = None
    chercheurs_list = []
    
    try:
        # Establish connection
        connection = mysql.connector.connect(**db_config)
        
        if connection.is_connected():
            print(f"Connected to MySQL database: {db_config['database']}")
            
            # Create cursor and execute query
            cursor = connection.cursor()
            
            # Simple query to get only chercheur_id and nom_complet
            query = """
            SELECT chercheur_id, nom_complet
            FROM chercheur_lmcs
            ORDER BY nom_complet
            """
            
            cursor.execute(query)
            results = cursor.fetchall()
            
            # Store results in a list of tuples
            chercheurs_list = [(row[0], row[1]) for row in results]
            
            print(f"Found {len(chercheurs_list)} researchers in LMCS.")
            
            # Print the list for verification
            print("\nList of LMCS Researchers:")
            for chercheur_id, nom_complet in chercheurs_list:
                print(f"ID: {chercheur_id}, Name: {nom_complet}")
                
            return chercheurs_list
            
    except Error as e:
        print(f"Error connecting to MySQL database: {e}")
        return []
    
    finally:
        # Close connection
        if connection and connection.is_connected():
            cursor.close()
            connection.close()
            print("\nMySQL connection closed.")

if __name__ == "__main__":
    # Call the function and get the list
    chercheurs = get_chercheur_lmcs_names()
    print("\n",len(chercheurs))
    
    # The chercheurs variable now contains a list of tuples: [(id1, name1), (id2, name2), ...]
    print("\nRetrieved researcher list:", chercheurs)