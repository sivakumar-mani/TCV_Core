export class globalConstants {
    // message
   // message 

public static genericError:string ="Some thing went wrong, try some time later";

public static unauthorized :string ="You are not authorized person to visit this page";

public static nameRegex:string ="[a-zA-Z0-9]*";

public static emailRegex:string="[A-Za-z0-9._%-]+@[A-Za-z0-9._%-]+\\.[a-z]{2,3}";

// public static contactNumberRegex: string ="^[e0-9](10,10)$"
public static contactNumberRegex: string = "^\\d{10}$";

public static passwordRegex: string = "^[A-Za-z0-9@$]{8,50}$";

// variable
public static errorRegex:string ="error";
}